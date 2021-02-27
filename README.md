# Verge3D User Manual and API Reference

Here is the source code of Verge3D User Manual and API Reference.

## Translation Guide

1. Install npm.

2. Go to the documentation folder and install dependencies with the command:
```
npm install
```

3. Copy the translated manual file(s) from the *manual/en/...* to *manual/LANG* directory or if you're going to translate the API documenation, copy from *api/en/...* to *api/LANG*.

4. Add translated file(s) to the *list.json* file.

5. Add translated language in the *generate.js* file:
```
const LANGUAGES = ['en', 'ru', 'zh', 'PUT_YOUR_LANGUAGE_HERE']
```

6. Generate documentation:
```
node generate.js
```

7. Check out the generated manual in the *output* directory.
