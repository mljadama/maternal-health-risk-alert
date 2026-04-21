const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function replaceOnce(filePath, search, replace) {
    if (!fs.existsSync(filePath)) {
        console.warn(`[patches] Skipping missing file: ${filePath}`)
        return false
    }

    const original = fs.readFileSync(filePath, 'utf8')
    if (original.includes(replace)) {
        console.log(`[patches] Already patched: ${path.relative(root, filePath)}`)
        return false
    }

    if (!original.includes(search)) {
        console.warn(`[patches] Pattern not found in ${path.relative(root, filePath)}`)
        return false
    }

    const updated = original.replace(search, replace)
    fs.writeFileSync(filePath, updated, 'utf8')
    console.log(`[patches] Patched: ${path.relative(root, filePath)}`)
    return true
}

const bootstrapPath = path.join(
    root,
    'node_modules',
    '@dhis2',
    'cli-app-scripts',
    'src',
    'lib',
    'bootstrapShell.js'
)

const compilePath = path.join(
    root,
    'node_modules',
    '@dhis2',
    'cli-app-scripts',
    'src',
    'lib',
    'compiler',
    'compile.js'
)

const bootstrapSearch = `    const srcNodeModules = path.join(source, 'node_modules')
    const destNodeModules = path.join(dest, 'node_modules')
    if (fs.existsSync(srcNodeModules)) {
        reporter.debug(
            \`Linking \${path.relative(
                paths.base,
                destNodeModules
            )} to \${path.relative(paths.base, srcNodeModules)}...\`
        )
        fs.ensureSymlinkSync(srcNodeModules, destNodeModules)
    }
}`

const bootstrapReplace = `    const srcNodeModules = path.join(source, 'node_modules')
    const destNodeModules = path.join(dest, 'node_modules')
    if (fs.existsSync(srcNodeModules)) {
        reporter.debug(
            \`Linking \${path.relative(
                paths.base,
                destNodeModules
            )} to \${path.relative(paths.base, srcNodeModules)}...\`
        )
        try {
            // On Windows, creating symbolic links can fail without elevated rights.
            // Prefer a junction there, and fall back to a physical copy if linking fails.
            if (process.platform === 'win32') {
                fs.ensureSymlinkSync(srcNodeModules, destNodeModules, 'junction')
            } else {
                fs.ensureSymlinkSync(srcNodeModules, destNodeModules)
            }
        } catch (error) {
            if (process.platform === 'win32') {
                reporter.print(
                    chalk.dim(
                        chalk.yellow(
                            'Could not create node_modules link on Windows; falling back to copy.'
                        )
                    )
                )
                fs.copySync(srcNodeModules, destNodeModules, {
                    dereference: true,
                })
            } else {
                throw error
            }
        }
    }
}`

const compileSearch = `const watchFiles = ({ inputDir, outputDir, processFileCallback, watch }) => {
    const processFile = async (source) => {
        const relative = path.relative(inputDir, source)
        const destination = path.join(outputDir, relative)
        reporter.debug(\`File \${relative} changed or added...\`)
        await fs.ensureDir(path.dirname(destination))
        await processFileCallback(source, destination)
    }

    const removeFile = async (file) => {
        const relative = path.relative(inputDir, file)
        const outFile = path.join(outputDir, relative)
        reporter.debug(\`File \${relative} removed... removing: \`, outFile)
        fs.remove(outFile)
    }
`

const compileReplace = `const watchFiles = ({ inputDir, outputDir, processFileCallback, watch }) => {
    const isTransientFsError = (error) =>
        error && (error.code === 'ENOENT' || error.code === 'EBUSY')

    const processFile = async (source) => {
        const relative = path.relative(inputDir, source)
        const destination = path.join(outputDir, relative)
        reporter.debug(\`File \${relative} changed or added...\`)
        try {
            await fs.ensureDir(path.dirname(destination))
            await processFileCallback(source, destination)
        } catch (error) {
            // Ignore transient file-system races on Windows watchers.
            if (isTransientFsError(error)) {
                reporter.debug(
                    \`Skipping transient \${error.code} while processing \${relative}\`
                )
                return
            }
            throw error
        }
    }

    const removeFile = async (file) => {
        const relative = path.relative(inputDir, file)
        const outFile = path.join(outputDir, relative)
        reporter.debug(\`File \${relative} removed... removing: \`, outFile)
        try {
            await fs.remove(outFile)
        } catch (error) {
            if (isTransientFsError(error)) {
                reporter.debug(
                    \`Skipping transient \${error.code} while removing \${relative}\`
                )
                return
            }
            throw error
        }
    }
`

replaceOnce(bootstrapPath, bootstrapSearch, bootstrapReplace)
replaceOnce(compilePath, compileSearch, compileReplace)
