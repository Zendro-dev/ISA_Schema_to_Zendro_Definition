let PARENT;
let relationMapping = {};
const mapIsaTypeToZendroType = {
  string: "String",
  "date-time": "DateTime",
  number: "Float",
  email: "String",
  uri: "String",
};
let zendroAttributes = {
  model: PARENT,
  storageType: "sql",
  attributes: {},
  associations: {},
};

const processProperties = function (propertiesObj, parentName) {
  PARENT = getSchemaName(parentName);
  zendroAttributes.model = PARENT;
  const props = Object.entries(propertiesObj);
  props.forEach((prop) => {
    const propDef = prop[1];
    if (propDef.type === "array") {
      const def = processArray(prop);
      if (def && def[1] === "objects") {
        Object.assign(zendroAttributes.associations, def[0][0]);
        Object.assign(zendroAttributes.attributes, {
          [prop[0] + "_fk"]: "[String]",
        });
      } else if (def) Object.assign(zendroAttributes.attributes, def[0]);
    } else if (!propDef.type || propDef.type === "object") {
      let [associations, foreignKey] = processAssociation(prop);
      if (associations && foreignKey) {
        Object.assign(zendroAttributes.associations, associations);
        Object.assign(zendroAttributes.attributes, { [foreignKey]: "[String]" });
      }
    } else Object.assign(zendroAttributes.attributes, processScalar(prop));
  });

  // Manually add an 'id' field:
  zendroAttributes.attributes["id"] = "String";
  console.log("--- " + PARENT + " ---");
  console.log(zendroAttributes);
  return zendroAttributes;
};

const recognizeIsaType = function (propDef) {
  return !propDef.format
    ? mapIsaTypeToZendroType[propDef.type]
    : mapIsaTypeToZendroType[propDef.format];
};

const processArray = function (arrayProp) {
  console.log(`Processing array ${JSON.stringify(arrayProp[0])}`);
  const items = arrayProp[1].items;
  // TODO handle 'anyOf' separately
  if (items["$ref"] || items["anyOf"]) {
    console.log(`Found multiple references ${items["$ref"]}`);
    return [processAssociation(arrayProp), "objects"];
  } else if (!items.type) {
    // This is a scalar
    console.log(`Found multiple scalars ${items.type}`);
    return [`[${recognizeIsaType(arrayProp)}]`, "scalars"];
  }
  return null;
};

const processAssociation = function (assocProp) {
  console.log(`Processing association ${JSON.stringify(assocProp[0])}`);
  let to_many = "items" in assocProp[1],
    references = "items" in assocProp[1] ? assocProp[1].items : assocProp[1],
    schemaName = "";

  if (Object.keys(references).includes("$ref")) {
    // there is a single reference to another schema
    schemaName = getSchemaName(references["$ref"]);
    schemaName in relationMapping
      ? relationMapping[schemaName].push(PARENT)
      : (relationMapping[schemaName] = [PARENT]);
    const foreignKeyName = assocProp[0] + "_fk";
    return [
      { [assocProp[0]]: relationTemplate(to_many, schemaName, "To-Do-Key", "To-Do-keyIn") },
      foreignKeyName,
    ];
  } else if (Object.keys(references).includes("anyOf")) {
    const no_refs = references.anyOf.every(element => Object.keys(element)[0] !== "$ref");
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
    // for loop with a recursive call ?
  }
  return [null, null]
};

const processScalar = function (scalarProp) {
  console.log(`Processing scalar ${scalarProp[0]}`);
  if (scalarProp[0] !== "@id") {
    const result = { [scalarProp[0]]: recognizeIsaType(scalarProp[1]) };
    console.log(result);
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

module.exports = {
  processProperties,
  processArray,
  processAssociation,
  processScalar,
  getSchemaName,
  relationMapping,
};
