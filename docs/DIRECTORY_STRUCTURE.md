# Directory Structure

```text
/media/shaurya/LinuxDev/linux/Projects/react/Shilpsahayak/
├── frontend/                  # React + Vite Frontend SPA
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route page components
│   │   ├── store/             # Zustand state management (`store.ts`)
│   │   ├── lib/               # Utilities and Firebase config
│   │   ├── App.tsx            # Main application router
│   │   └── main.tsx           # Entry point
│   ├── public/                # Static assets
│   ├── index.html             # HTML template
│   ├── package.json           # Frontend dependencies
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   └── vite.config.ts         # Vite bundler configuration
│
├── slicer-service/            # Python FastAPI Slicer Backend
│   ├── main.py                # FastAPI app and API endpoints
│   ├── pricing_engine.py      # Calculates authoritative quotes
│   ├── slicer_router.py       # Routes jobs to specific slicer logic
│   ├── printer_eligibility.py # Checks if model fits printer dimensions
│   ├── slicer_result_validator.py # Validates slicer output
│   ├── archive_handler.py     # Handles ZIP archives
│   ├── file_inspector.py      # Inspects 3D model files
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile             # Container definition for the service
│
├── shilp-sahayak-r2/          # Cloudflare R2 Worker
│   ├── src/
│   │   └── index.ts           # Worker entry point and routing
│   ├── package.json           # Worker dependencies
│   └── wrangler.toml          # Cloudflare deployment config
│
└── docs/                      # Documentation directory
```

## Detailed Explanations
- **frontend/**: Contains all code for the React application. Separates components and pages, with routing handled in `App.tsx` and state managed via Zustand.
- **slicer-service/**: Contains the Python microservice. Key business logic (slicing routing, eligibility, pricing) is isolated in specific modules.
- **shilp-sahayak-r2/**: Contains the lightweight Cloudflare Worker script that interfaces with R2 storage.
- **docs/**: Comprehensive documentation for the overall project.
