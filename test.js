const fs = require("fs");
const u = require("./utils.js");

fs.readdir("./isa_1_0_core/", (err, files) => {
  let output = {};
  files.forEach((file) => {
    console.log(`PROCESSING FILE ${file}`);
    const schemaName = u.getSchemaName(file),
      i = require(`./isa_1_0_core/${file}`);
    output[schemaName] = u.processProperties(i.properties, schemaName);
  });
  console.log(u.relationMapping);
  // we now need to process reverse relationships from u.relationMapping
});
