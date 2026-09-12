// Existing tests construct silent servers directly; this is an explicit test-only keyring.
process.env.GEM_CURSOR_KEYS ??= 'test-key-A:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
