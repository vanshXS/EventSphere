# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Manual verification deployment

Manual applications collect institutional evidence and an initial administrator nomination. Super admins must review both documents before approving. Approval emails a seven-day, single-use invitation; approved applications can resend the invitation from the super-admin screen. Set `FRONTEND_URL` to the public frontend URL and configure working SMTP credentials on the backend. Invitation delivery is required for approval.

Uploaded identity and institution documents are stored locally by the backend. Set `DOCUMENT_STORAGE_DIR` to a private, persistent, backed-up volume shared by all backend instances; the default `./data/eventsphere-documents` is only suitable when that directory is persistent. Migrate existing files from the old temporary `eventsphere-documents` directory before setting a custom storage path. The default path can read legacy temporary files as a fallback. Restrict filesystem access, establish retention and deletion policies, and never serve this directory publicly. MongoDB transactions require a replica set (including in development).
