const fs = require('fs');
let PARENT,
    VERBOSE = true,
    relationMapping = {},
    zendroAttributes = {
      model: PARENT,
      storageType: "sql",
      attributes: {},
      associations: {},
    };
const mapIsaTypeToZendroType = {
  string: "String",
  "date-time": "DateTime",
  number: "Float",
  email: "String",
  uri: "String",
};

const processProperties = function (propertiesObj, parentName) {
  PARENT = getSchemaName(parentName);
  zendroAttributes.model = PARENT;
  const props = Object.entries(propertiesObj);
  props.forEach((prop) => {
    const propDef = prop[1];

    // PROCESS ARRAYS
    if (propDef.type === "array") {
      const def = processArray(prop);
      if (def && def[1] === "objects") {
        Object.assign(zendroAttributes.associations, def[0][0]);
        Object.assign(zendroAttributes.attributes, {
          [prop[0] + "_fk"]: "[String]",
        });
      }
      else if (def && def[1] === "scalars") Object.assign(zendroAttributes.attributes, def[0]);
      else if (def && def[1] === "multiples") {
        def[0].forEach(definition => {
          const attr = {[definition.name + "_fk"]: "[String]"},
              assoc = {[definition.name]: definition.value};
          Object.assign(zendroAttributes.attributes, attr);
          Object.assign(zendroAttributes.associations, assoc);
        })
      }
    }

    // PROCESS ASSOCIATIONS
    else if (!propDef.type || propDef.type === "object") {
      let [associations, foreignKey] = processAssociation(prop);
      if (associations && foreignKey) {
        Object.assign(zendroAttributes.associations, associations);
        Object.assign(zendroAttributes.attributes, { [foreignKey]: "[String]" });
      }
      else Object.assign(zendroAttributes.attributes, { [prop[0]]: "String" });
    }

    // PROCESS SCALARS
    else Object.assign(zendroAttributes.attributes, processScalar(prop));
  });

  // Manually add an 'id' field:
  zendroAttributes.attributes["id"] = "String";
  if (VERBOSE) {
    console.log("--- " + PARENT + " ---");
    console.log(zendroAttributes);
  }

  return zendroAttributes;
};

const recognizeIsaType = function (propDef) {
  return !propDef.format
    ? mapIsaTypeToZendroType[propDef.type]
    : mapIsaTypeToZendroType[propDef.format];
};

const processArray = function (arrayProp) {
  if (VERBOSE) console.log(`Processing array ${JSON.stringify(arrayProp[0])}`);
  const items = arrayProp[1].items;
  if (items["$ref"]) {
    if (VERBOSE) console.log(`Found multiple references ${items["$ref"]}`);
    return [processAssociation(arrayProp), "objects"];
  }
  else if (items["anyOf"]) {
    if (VERBOSE) console.log(`Found multiple $ref ${items.items}`);
    let outputRelations = []
    items['anyOf'].forEach((item) => {
      outputRelations.push(
          {
            name: `${arrayProp[0]}_${getSchemaName(item["$ref"])}`,
            value: processAnyOf({"anyOf": [item]})
          }
      )
    })
    return [outputRelations, "multiples"]
  }
  else if (!items.type) {
    if (VERBOSE) console.log(`Found multiple scalars ${items.type}`);
    return [`[${recognizeIsaType(arrayProp)}]`, "scalars"];
  }
  return null;
};

const processAssociation = function (assocProp) {
  if (VERBOSE) console.log(`Processing association ${JSON.stringify(assocProp[0])}`);
  let to_many = "items" in assocProp[1],
    references = "items" in assocProp[1] ? assocProp[1].items : assocProp[1],
    schemaName = "";

  if (Object.keys(references).includes("$ref")) {
    // there is a single reference to another schema
    schemaName = getSchemaName(references["$ref"]);
    schemaName in relationMapping
      ? relationMapping[schemaName].push(PARENT)
      : (relationMapping[schemaName] = [PARENT]);
    return [
      { [assocProp[0]]: relationTemplate(to_many, schemaName, "To-Do-Key", "To-Do-keyIn") },
      assocProp[0] + "_fk",
    ];
  }

  else if (Object.keys(references).includes("anyOf")) {
    const anyOf = processAnyOf(assocProp[1], to_many);
    if (anyOf === 'String') return [null, null]
    else {
      return [
        { [assocProp[0]]: anyOf },
        assocProp[0] + "_fk",
      ];
    }

    /*const no_refs = references.anyOf.every(element => Object.keys(element)[0] !== "$ref");
    console.log(`\n\nanyOf case for field '${assocProp[0]}' to_many? '${to_many}' no_refs? ${no_refs}:\n${JSON.stringify(references)}\n\n`);
    if (no_refs) {
      const attrType = to_many ? "[String]" : "String"
      zendroAttributes.attributes[assocProp[0]] = attrType;
    } else {
      const refs = references.anyOf.filter(element => Object.keys(element)[0] === "$ref");
      let ref_assocs = refs.map(r => {
        const target = getSchemaName(r["$ref"]);
        const keyIn = to_many ? zendroAttributes.model : target;
        const assocName = `${assocProp[0]}_${target}`;
        const targetKey = `${target}_id`;
        console.error(`keyIn: ${keyIn}`);
        const assocDef = relationTemplate(to_many, target, targetKey, keyIn);
        zendroAttributes.associations[assocName] = assocDef;
        console.error(`anyOf - assoc '${assocName}':\n` + JSON.stringify(zendroAttributes.associations[assocName]));
        // Add foreign-key if on the to-one end:
        if (to_many) {
          zendroAttributes.attributes[targetKey] = 'String';
          //console.error("anyOf - FK:\n" + JSON.stringify(zendroAttributes.attributes))
        }
      })
    }
    // assocPorps = {}
    // How do I know, whether this is type array or not
    //if (to_many) {} else {}
    // skip non $ref, except when there is no $ref use a string
    // there are multiple types and or references (we don't use oneOf and allOf in ISA)
    // for loop with a recursive call ?*/
  }
  return [null, null]
};

function processAnyOf(fieldProp, to_many) {
  if (VERBOSE)  console.log(`Processing anyOf ${JSON.stringify(fieldProp)}`);
  const item = fieldProp['anyOf'].filter(element => "$ref" in element)[0];
  if (item) {
    const target = getSchemaName(item["$ref"]),
        keyIn = to_many ? PARENT : target,
        targetKey = `${target}_id`;
    target in relationMapping
        ? relationMapping[target].push(PARENT)
        : (relationMapping[target] = [PARENT]);
    return relationTemplate(to_many, target, targetKey, keyIn);
  }
  return "String"
}

const processScalar = function (scalarProp) {
  if (VERBOSE) console.log(`Processing scalar ${scalarProp[0]}`);
  if (scalarProp[0] !== "@id") {
    const result = { [scalarProp[0]]: recognizeIsaType(scalarProp[1]) };
    if (VERBOSE) console.log(result);
    return result;
  }
};

function getSchemaName(string) {
  return string.replace("_schema.json", "").replace("#", "");
}

function relationTemplate(toMany, schemaName, targetKey, keysIn) {
  return {
    type: toMany ? "to_many" : "to_one",
    target: schemaName,
    targetStorageType: "sql",
    implementation: "foreignkeys",
    reverseAssociation: "TO-DO",
    targetKey,
    keysIn
  };
}

/** Sets the value of verbosity to true or false. If verbosity is true, the console will output logs.
 * @param {Boolean} bool - controls the value of the verbosity
 */
function setVerbose(bool) {
  VERBOSE = bool;
}

function writeToFile(schema) {
  if (VERBOSE) console.log(`Writting to file ${schema.name}`)
  const filePath = `./src/output/${schema.name}.json`,
      data = JSON.stringify(schema.value, null, 2);
  fs.writeFile(filePath, data, (err) => {
    if (err) throw err;
    if (VERBOSE) console.log(`File ${filePath} written.`);
  })
}

module.exports = {
  processProperties,
  processArray,
  processAssociation,
  processScalar,
  getSchemaName,
  relationMapping,
  setVerbose,
  writeToFile
};
