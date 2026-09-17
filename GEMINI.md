# System Directive for Just1Play (https://app.just1play.com/)

You are working on a persistent full-stack Firebase architecture for Just1Play.
You must permanently adhere to the project's Core Security Contract on every modification:

1. Never reset or overwrite `firestore.rules` and `storage.rules`.
2. All authenticated members must always be able to upload photos (`image/*`) and create social wall posts.
3. Standard members must only submit external video URLs (Hudl, YouTube, TikTok, Vimeo, Instagram).
4. Raw direct video uploads (`video/*`) to Firebase Storage are strictly locked to Admins only (`isAdmin()`).
5. Keep `.rules-protection.md` as the permanent system guideline for all future feature additions and builds.
6. Automatically sync and push all verified code changes to GitHub repository `kevoiebailey-lgtm/j1p-sports-network-app` (`npm run sync:github`).

Proceed with building the application while honoring these immutable security rules.
