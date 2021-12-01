const fs = require('fs')
const u = require('./utils.js')

fs.readdir("./isa_1_0_core/", (err, files) => {
    let output = {}
    files.forEach(file => {
        console.log(`PROCESSING FILE ${file}`)
        let schemaName = u.getSchemaName(file)
        let i = require(`./isa_1_0_core/${file}`)
        output[schemaName] = u.processProperties(i.properties, schemaName)
    });
    // we now need to process reverse relationships from u.relationMapping
});
