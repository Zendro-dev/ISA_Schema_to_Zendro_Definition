let PARENT;
let relationMapping = {};
const mapIsaTypeToZendroType = {
  "string": "String",
  "date-time": "DateTime",
  "number": "Float",
  "email": "String",
  "uri": "String"
}

const processProperties = function(propertiesObj, parentName) {
  PARENT = getSchemaName(parentName);
  const props = Object.entries(propertiesObj);
  let zendroAttributes = { model: PARENT, "storageType": "sql", attributes: {}, associations: {} }
  props.forEach(prop => {
    const propDef = prop[1];
    let def;
    if (propDef.type === "array") {
      def = processArray(prop);
      Object.assign(zendroAttributes.associations, def)
    }
    else if (!propDef.type || propDef.type === "object") {
      def = processAssociation(prop);
      Object.assign(zendroAttributes.associations, def)
    }
    else {
      def = processScalar(prop);
      Object.assign(zendroAttributes.attributes, def)
    }
  });

  // Manually add an 'id' field:
  zendroAttributes.attributes["id"] = "String";
  console.log('--- ' + PARENT + ' ---')
  console.log(zendroAttributes);
  return zendroAttributes;
}

const recognizeIsaType = function(propDef) {
  return !propDef.format ? mapIsaTypeToZendroType[propDef.type] : mapIsaTypeToZendroType[propDef.format]
}

const processArray = function(arrayProp) {
  console.log(`Processing array ${JSON.stringify(arrayProp[0])}`)
  const items = arrayProp[1].items
  if (items['$ref']) {
    // This is a reference to another schema. Most relationships will go through here.
    console.log(`Found reference to another schema ${items['$ref']}`)
    return processAssociation(arrayProp, 'array')
  }
  else if (items.types && items.types === 'object') {
    // This is a reference to a nested object
    console.log(`Found reference to another object ${items.type}`)
    processAssociation(arrayProp, 'array')
  }
  else if (items['anyOf']) {
    // This is a reference to multiples schemas or objects
    console.log(`Found reference to multiple objects ${items['anyOf']}`)
    processAssociation(arrayProp, 'array')
  }
  else {
    // This is a scalar
    console.log(`Found scalar ${items.type}`)
    return `[${recognizeIsaType(arrayProp)}]`
  }
  // are you a scalar array?
  // if scalar, you'll become a Zendro "array-field", e.g. "[String]"
  // if object, you'll become a Zendro association
}

const processAssociation = function(assocProp, from) {
  console.log(`Processing association ${JSON.stringify(assocProp[0])}`)
  const references = 'items' in assocProp[1] ? assocProp[1].items : assocProp[1]
  let schemaName = "";
  if (Object.keys(references).includes('$ref')) {
    // there is a single reference to another schema
    schemaName = getSchemaName(references['$ref'])
    schemaName in relationMapping ? relationMapping[schemaName].push(PARENT) : relationMapping[schemaName] = [PARENT]
  }
  else if (Object.keys(references).includes('anyOf')) {
    // there are multiple references (we don't use oneOf and allOf in ISA)
    // for loop with a recursive call ?
  }
  else if (Object.keys(references).includes('type') && references.type === 'object'){
    // this is a nested reference aka a reference to an object not contained in its own schema
    // we need to create a new schema for that field that will end up in a separate file.
  }
  return {[assocProp[0]]: {
    type: from === 'array' ? 'to_many' : 'to_one',
    target: schemaName,
    targetStorageType: "sql",
    targetKey: null,
    keyIn: null,
    label: null
  }}
}

const processScalar = function(scalarProp) {
  console.log(`Processing scalar ${scalarProp[0]}`);
  if (scalarProp[0] !== "@id") {
    const result = { [scalarProp[0]]: recognizeIsaType(scalarProp[1]) }
    console.log(result)
    return result
  }
}

function getSchemaName(string) { return string.replace('_schema.json', '').replace("#", '')}

module.exports = {
  processProperties,
  processArray,
  processAssociation,
  processScalar,
  getSchemaName,
  relationMapping
}
