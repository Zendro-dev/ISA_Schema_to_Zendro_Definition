let PARENT;
let relationMapping = {};
const mapIsaTypeToZendroType = {
  string: "String",
  "date-time": "DateTime",
  number: "Float",
  email: "String",
  uri: "String",
};

const processProperties = function (propertiesObj, parentName) {
  PARENT = getSchemaName(parentName);
  const props = Object.entries(propertiesObj);
  let zendroAttributes = {
    model: PARENT,
    storageType: "sql",
    attributes: {},
    associations: {},
  };
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
      Object.assign(zendroAttributes.associations, associations);
      Object.assign(zendroAttributes.attributes, { [foreignKey]: "[String]" });
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
  } else if (Object.keys(references).includes("anyOf")) {
    // there are multiple types and or references (we don't use oneOf and allOf in ISA)
    // for loop with a recursive call ?
  }
  const foreignKeyName = assocProp[0] + "_fk";
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

function relationTemplate(toMany, schemaName) {
  return {
    type: toMany ? "to_many" : "to_one",
    target: schemaName,
    targetStorageType: "sql",
    targetKey: null,
    keyIn: null,
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
