# Development Ports

Local website projects use the `3200-3499` range so they can run side by side without collisions. Software, tooling, and non-website development projects should use `5100-5999`.

Database services may keep standard local ports, such as MySQL on `3306` and Postgres on `5432`; do not assign application dev servers to those service ports.

## Assigned Ports

| Surface | Port |
| --- | ---: |
| Thunder Road frontend | `3204` |
| Thunder Road backend API | `3304` |

The local dev scripts already use these assigned ports by default. Override with environment variables only for temporary local debugging.
