//! Posts: club/user posts feed.
//!
//! Ports: `backend/posts/` (models, serializers, views).
//!
//! Parity note: the legacy `posts` app defines views (`PostListView`,
//! `PostCreateView`, `PostRetrieveUpdateDestroyView`) but its `urls.py` is empty,
//! so **no posts endpoints are wired into the live Django API**. There is
//! therefore nothing to port for route parity in Phase 4. The `posts` table and
//! the GDPR erasure rules (author-cascade) already exist in the schema; routes
//! will be added if/when the product surfaces a feed.
