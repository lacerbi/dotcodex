## Agent Selection

When deploying sub-agents, calibrate agent intelligence to task complexity:
- **Haiku**: Only trivial, read-only tasks requiring no interpretation (listing files, reading contents, checking if something exists). Best suited for parallelizing many simple tasks at scale.
- **Sonnet**: Standard implementation, straightforward execution, mechanical checks (linting output, test pass/fail)
- **Opus**: Anything requiring judgment—analysis, review, verification, planning, debugging, architectural decisions