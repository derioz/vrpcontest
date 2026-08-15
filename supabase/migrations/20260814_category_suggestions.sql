-- ==============================================================================
-- Vital RP Photo Contest - Category Suggestions Schema & Migration
-- ==============================================================================
-- Description: Reddit-style Category Suggestions system with upvoting/downvoting
-- and admin moderation tools.
-- ==============================================================================

-- 1. Create Category Suggestions Table
CREATE TABLE IF NOT EXISTS public.category_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name TEXT NOT NULL CHECK (char_length(trim(category_name)) > 0 AND char_length(category_name) <= 100),
    description TEXT NOT NULL CHECK (char_length(trim(description)) > 0 AND char_length(description) <= 1000),
    user_id TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_avatar_url TEXT,
    author_discord_id TEXT,
    is_admin_author BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Category Suggestion Votes Table
CREATE TABLE IF NOT EXISTS public.category_suggestion_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID NOT NULL REFERENCES public.category_suggestions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_suggestion_user_vote UNIQUE (suggestion_id, user_id)
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_cat_sug_created_at ON public.category_suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cat_sug_user_id ON public.category_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_cat_sug_votes_sug_id ON public.category_suggestion_votes(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_cat_sug_votes_user_id ON public.category_suggestion_votes(user_id);

-- 4. Enable Row Level Security
ALTER TABLE public.category_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_suggestion_votes ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function: Check if current user is an Administrator
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
    -- Superadmin email checks
    IF lower(coalesce(auth.jwt() ->> 'email', '')) IN ('tx.davidj@gmail.com', 'txdavidj@gmail.com') THEN
        RETURN true;
    END IF;

    -- Discord ID / provider ID checks against known admin Discord IDs
    IF (auth.jwt() -> 'user_metadata' ->> 'provider_id') IN (
        '150580708144840704',
        '504708209936695307',
        '399373087172198400'
    ) OR (auth.jwt() -> 'user_metadata' ->> 'sub') IN (
        '150580708144840704',
        '504708209936695307',
        '399373087172198400'
    ) THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. RLS Policies for category_suggestions

-- View suggestions: Available to everyone (anon & authenticated)
DROP POLICY IF EXISTS "Public can view category suggestions" ON public.category_suggestions;
CREATE POLICY "Public can view category suggestions"
ON public.category_suggestions
FOR SELECT
USING (true);

-- Insert suggestions: Any authenticated user
DROP POLICY IF EXISTS "Authenticated users can create category suggestions" ON public.category_suggestions;
CREATE POLICY "Authenticated users can create category suggestions"
ON public.category_suggestions
FOR INSERT
WITH CHECK (
    auth.role() = 'authenticated' OR auth.role() = 'anon'
);

-- Delete suggestions: Author or Administrator
DROP POLICY IF EXISTS "Author or Admin can delete category suggestions" ON public.category_suggestions;
CREATE POLICY "Author or Admin can delete category suggestions"
ON public.category_suggestions
FOR DELETE
USING (
    user_id = auth.uid()::text 
    OR user_id = (auth.jwt() -> 'user_metadata' ->> 'provider_id')
    OR public.is_admin_user()
    OR auth.role() = 'service_role'
);

-- 7. RLS Policies for category_suggestion_votes

-- View votes: Available to everyone
DROP POLICY IF EXISTS "Public can view category suggestion votes" ON public.category_suggestion_votes;
CREATE POLICY "Public can view category suggestion votes"
ON public.category_suggestion_votes
FOR SELECT
USING (true);

-- Insert/Update/Delete own votes
DROP POLICY IF EXISTS "Users can manage their own category suggestion votes" ON public.category_suggestion_votes;
CREATE POLICY "Users can manage their own category suggestion votes"
ON public.category_suggestion_votes
FOR ALL
USING (
    user_id = auth.uid()::text 
    OR user_id = (auth.jwt() -> 'user_metadata' ->> 'provider_id')
    OR auth.role() = 'authenticated'
    OR auth.role() = 'anon'
)
WITH CHECK (
    user_id = auth.uid()::text 
    OR user_id = (auth.jwt() -> 'user_metadata' ->> 'provider_id')
    OR auth.role() = 'authenticated'
    OR auth.role() = 'anon'
);

-- 8. RPC: Fetch suggestions with calculated score and user vote state
CREATE OR REPLACE FUNCTION public.get_category_suggestions(
    p_user_id TEXT DEFAULT NULL,
    p_sort TEXT DEFAULT 'newest'
)
RETURNS TABLE (
    id UUID,
    category_name TEXT,
    description TEXT,
    user_id TEXT,
    author_name TEXT,
    author_avatar_url TEXT,
    author_discord_id TEXT,
    is_admin_author BOOLEAN,
    score BIGINT,
    upvotes BIGINT,
    downvotes BIGINT,
    user_vote INT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.category_name,
        cs.description,
        cs.user_id,
        cs.author_name,
        cs.author_avatar_url,
        cs.author_discord_id,
        cs.is_admin_author,
        COALESCE(SUM(csv.vote), 0)::BIGINT AS score,
        COUNT(CASE WHEN csv.vote = 1 THEN 1 END)::BIGINT AS upvotes,
        COUNT(CASE WHEN csv.vote = -1 THEN 1 END)::BIGINT AS downvotes,
        COALESCE(MAX(CASE WHEN p_user_id IS NOT NULL AND csv.user_id = p_user_id THEN csv.vote ELSE 0 END), 0)::INT AS user_vote,
        cs.created_at,
        cs.updated_at
    FROM public.category_suggestions cs
    LEFT JOIN public.category_suggestion_votes csv ON cs.id = csv.suggestion_id
    GROUP BY cs.id
    ORDER BY
        CASE WHEN p_sort = 'top' THEN COALESCE(SUM(csv.vote), 0) END DESC,
        CASE WHEN p_sort = 'lowest' THEN COALESCE(SUM(csv.vote), 0) END ASC,
        CASE WHEN p_sort = 'oldest' THEN cs.created_at END ASC,
        cs.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 9. RPC: Atomic Vote / Vote Toggle
CREATE OR REPLACE FUNCTION public.vote_category_suggestion(
    p_suggestion_id UUID,
    p_user_id TEXT,
    p_vote INT
)
RETURNS JSONB AS $$
DECLARE
    v_new_score BIGINT;
    v_upvotes BIGINT;
    v_downvotes BIGINT;
    v_user_vote INT;
BEGIN
    IF p_vote = 0 THEN
        -- Remove vote
        DELETE FROM public.category_suggestion_votes
        WHERE suggestion_id = p_suggestion_id AND user_id = p_user_id;
        v_user_vote := 0;
    ELSIF p_vote IN (1, -1) THEN
        -- Upsert vote
        INSERT INTO public.category_suggestion_votes (suggestion_id, user_id, vote, updated_at)
        VALUES (p_suggestion_id, p_user_id, p_vote, timezone('utc'::text, now()))
        ON CONFLICT (suggestion_id, user_id)
        DO UPDATE SET vote = EXCLUDED.vote, updated_at = timezone('utc'::text, now());
        v_user_vote := p_vote;
    ELSE
        RAISE EXCEPTION 'Invalid vote value: must be 1, -1, or 0';
    END IF;

    -- Calculate updated totals
    SELECT 
        COALESCE(SUM(vote), 0),
        COUNT(CASE WHEN vote = 1 THEN 1 END),
        COUNT(CASE WHEN vote = -1 THEN 1 END)
    INTO v_new_score, v_upvotes, v_downvotes
    FROM public.category_suggestion_votes
    WHERE suggestion_id = p_suggestion_id;

    RETURN jsonb_build_object(
        'success', true,
        'suggestion_id', p_suggestion_id,
        'user_id', p_user_id,
        'user_vote', v_user_vote,
        'score', v_new_score,
        'upvotes', v_upvotes,
        'downvotes', v_downvotes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
