Pull the latest shared resources from rw-meta into this project.

1. Run the sync script:
```bash
/root/share/projects/rw-meta/scripts/sync-to-project.sh "$(pwd)"
```

2. Check what changed:
```bash
git diff --stat
```

3. Report what was updated (templates, skills, configs) and whether any project-specific customizations were overwritten.
