/// <reference types="vite/client" />

// add API_URL

interface ImportMetaEnv {
	readonly VITE_APP_API: string
	// add more environment variables as needed
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
