const fs = require('fs')
const u = require('./utils.js')

let OUTPUT = {}

fs.readdir("./isa_1_0_core/", (err, files) => {
    files.forEach(file => {
        console.log(`PROCESSING FILE ${file}`)
        let schemaName = u.getSchemaName(file)
        let i = require(`./isa_1_0_core/${file}`)
        OUTPUT[schemaName] = u.processProperties(i.properties, schemaName)
    });
    // we now need to process reverse relationships from u.relationMapping
});
