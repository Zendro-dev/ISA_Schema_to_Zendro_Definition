const fs = require("fs");
const utils = require("./utils.js");

if (require.main === module) {
  const params = parseParams();
  if (params.verbose) utils.setVerbose(true)
  else utils.setVerbose(false)
  fs.readdir("./src/isa_1_0_core/", (err, files) => {
    let output = {};
    files.forEach((file) => {
      // console.log(`PROCESSING FILE ${file}`);
      const schemaName = utils.getSchemaName(file),
          i = require(`./isa_1_0_core/${file}`);
      output[schemaName] = utils.processProperties(i.properties, schemaName);
      utils.writeToFile({
        name: schemaName,
        value: output[schemaName]
      })
    });
    utils.writeToFile({
      name: "reverseRelations",
      value: utils.relationMapping
    })
  });
}

function parseParams() {
  const args = process.argv.slice(2);
  let params = {
    verbose: false
  }
  args.forEach((arg) => {
    const split = arg.split("=");
    if (split[0] === "mode" && split[1] === "verbose") params.verbose = true
  });
  return params;
}
