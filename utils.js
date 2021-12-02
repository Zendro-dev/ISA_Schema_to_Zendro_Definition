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
      if (def[1] === "objects") {
        Object.assign(zendroAttributes.associations, def[0]);
      } else Object.assign(zendroAttributes.attributes, def[0]);
    } else if (!propDef.type || propDef.type === "object") {
      let [associations, foreignKeys] = processAssociation(prop);
      Object.assign(zendroAttributes.associations, associations);
      Object.assign(zendroAttributes.attributes, { [foreignKeys]: "String" });
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
  if (
    items["$ref"] ||
    (items.types && items.types === "object") ||
    items["anyOf"]
  ) {
    console.log(`Found multiple references ${items["$ref"]}`);
    return [processAssociation(arrayProp), "objects"];
  } else {
    // This is a scalar
    console.log(`Found multiple scalars ${items.type}`);
    return [`[${recognizeIsaType(arrayProp)}]`, "scalars"];
  }
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
        const assocName = `${assocProp[0]}_${target}`;
        const targetKey = `${target}_id`;
        const keyIn = to_many ? zendroAttributes.model : target;
        console.error(`keyIn: ${keyIn}`);
        const assocDef = relationTemplate(to_many, target, targetKey, keyIn);
        zendroAttributes.associations[assocName] = assocDef;
        console.error(`anyOf - assoc '${assocName}':\n` + JSON.stringify(zendroAttributes.associations[assocName]));
        // Add foreign-key if on the to-one end:
        if (to_many) {
          zendroAttributes.attributes[targetKey] = 'String';
          //console.error("anyOf - FK:\n" + JSON.stringify(zendroAttributes.attributes));
        }
      })
    }
    // assocPorps = {}
    // How do I know, whether this is type array or not
    //if (to_many) {} else {}
    // skip non $ref, except when there is no $ref use a string
    // there are multiple types and or references (we don't use oneOf and allOf in ISA)
    // for loop with a recursive call ?
    // For each entry in references we need one association, except no $ref
    //return [
    //  { [assocProp[0]]: relationTemplate(to_many, schemaName) },
    //  foreignKeyName,
    //];
  } else if (
    Object.keys(references).includes("type") &&
    references.type === "object"
  ) {
    // this is a nested reference aka a reference to an object not contained in its own schema
    // we need to create a new schema for that field that will end up in a separate file.
  }
  const foreignKeyName = to_many ? "_ids" : "_id";
  return [
    { [assocProp[0]]: relationTemplate(to_many, schemaName) },
    foreignKeyName,
  ];
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
