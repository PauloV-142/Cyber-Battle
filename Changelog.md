# Cyber Battle - Version Tracker
### This is the Changelog, append your changes to the end of this file
### Follow the simple commit types `feat`, `fix`...
### Put the Version Number in the commit name! They are simpler than you imagine, see below!
---

## [Changelog Convention](https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13)

### Commit names - Look here:

- ##### Changes relevant to the API or UI:

    - ##### `feat` Commits that add, adjust or remove a feature to/of/from the API or UI

    - ##### `fix` Commits that fix an API or UI bug of a preceded feat commit

- ##### `refactor` Commits that rewrite or restructure code without altering API or UI behavior
    - ##### `perf` Commits are special type of refactor commits that specifically improve performance

- ##### `style` Commits that address *code style* (e.g., white-space, formatting, missing semi-colons) and do not affect application behavior. NOTICE: (CSS does affect app behavior, so CSS commits can be `feat` or `fix` too!)

- ##### `test` Commits that add missing tests or correct existing ones.

- ##### `docs` Commits that exclusively affect documentation.  

- ##### `build` Commits that affect build-related components such as build tools, dependencies, project version, etc...  

- ##### `ops` Commits that affect operational aspects like infrastructure (IaC), deployment scripts, CI/CD pipelines, backups, monitoring, or recovery procedures, etc...

- ##### `chore` Commits that represent tasks like *initial commit*, *modifying* .gitignore, etc...  

---

### Versioning
```js
// Put the version number in:
- In the `Commit Message` // To track
- In the `index.html` <title> // So the user can see it
- In the `README.md` // For astethic 
```

#### If your next release (e.g. merge of branch to main) contains commit with...
- **Breaking Changes** increment the ***major*** version: **1.x.x**  
- **API relevant changes** (`feat` or `fix`) increment the ***minor*** version: **x.1.x**  
- **Else** (`style`, `test`, `docs`, `build`, `ops` or `chore`) increment the ***patch*** version: **x.x.1**

---

## # Changelog ends here, Latest version is:
> Append your changes here:

<br>
<br>
<br>

---
**V0.1.2**
refactor: script.js to an external file 

---
**V0.1.1**
style: version info in all three places V0.1.2

---
Cyber Battle **V0.1.0**  
Feat: Placeholder page with PixiJS Imported properly

---
Cyber Battle **V0.0.1**  
docs: Added changelog

---
Cyber Battle **V0.0.0**<br>
chore: Nothing...

---

## # Changelog Starts here, It goes up ^
