const fs = require("fs");
const utils = require("./src/utils.js");

fs.readdir("./isa_1_0_core/", (err, files) => {
  let output = {};
  utils.setVerbose(false)
  files.forEach((file) => {
    // console.log(`PROCESSING FILE ${file}`);
    const schemaName = utils.getSchemaName(file),
      i = require(`./isa_1_0_core/${file}`);
    output[schemaName] = utils.processProperties(i.properties, schemaName);
  });
  // console.log(utils.relationMapping);
  // we now need to process reverse relationships from u.relationMapping
});
