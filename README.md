# Grade 12 History

A Khmer history study assistant for teacher ថន ពុធដារ៉ូ at វិទ្យាល័យជ្រោយបន្ទាយ, supporting history questions and exam preparation. Includes topic prompts, a published exam library, and private notebook storage.

The frontend is static HTML, CSS, and JavaScript. A TypeScript Netlify Function uses Gemini through Netlify AI Gateway; reference text is stored in Netlify Database through Drizzle. Each browser has its own randomly generated notebook identifier. Only this identifier is kept in localStorage; lesson content is stored in Postgres. Clearing browser storage loses access to that notebook. This is a personal study tool, not a teacher-authenticated shared curriculum editor. Do not add confidential information.

Install dependencies with `npm install`. Run locally using `netlify dev --port 8889` in a linked Netlify project. No frontend build is required; `public` is the publish directory. AI Gateway requires an initial production deployment. The platform applies database migrations during deployment.

Student chat and practice answers use the supplied 351-page history compilation, bundled explicitly with the study function, with the read-only published exam transcripts in Netlify Database as secondary reading aids. The PDF was verified as byte-identical to the user’s Google Drive document on 2026-11-09; transcripts must match the corresponding PDF passages before use. The PDF is sent directly to Gemini because text extraction corrupts its Khmer font encoding. The full document covers lessons, both exam tracks, key points, practice papers, and references; it is not truncated to notebook notes. Personal notebook submissions remain private and cannot change the shared curriculum or override answers.

The assistant is instructed to answer only from those sources, preserve conflicting passages with attribution, and decline unsupported questions instead of falling back to general knowledge. Structured responses require supporting PDF pages; missing or invalid citations produce a fixed Khmer refusal. These checks validate response shape and page bounds, not the factual correctness of the model's reading, so students should still verify the cited pages. Sending the full PDF on each request increases inference cost and latency. No live model accuracy evaluation has been performed.

Run `node --test tests/study.test.mjs` for isolated handler checks with mocked database and AI clients. These checks do not call external services or apply migrations.
