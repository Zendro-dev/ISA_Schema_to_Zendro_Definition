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
    if (propDef.type === "array") {
      const def = processArray(prop);
      if (def[1] === 'objects') Object.assign(zendroAttributes.associations, def[0])
      else Object.assign(zendroAttributes.attributes, def[0])
    }
    else if (!propDef.type || propDef.type === "object") {
      Object.assign(zendroAttributes.associations, processAssociation(prop))
    }
    else Object.assign(zendroAttributes.attributes, processScalar(prop))
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
  if (items['$ref'] || (items.types && items.types === 'object') || (items['anyOf'])) {
    console.log(`Found multiple references ${items['$ref']}`)
    return [processAssociation(arrayProp), 'objects']
  } else {
    // This is a scalar
    console.log(`Found multiple scalars ${items.type}`)
    return [`[${recognizeIsaType(arrayProp)}]`, 'scalars']
  }
}

const processAssociation = function(assocProp) {
  console.log(`Processing association ${JSON.stringify(assocProp[0])}`)
  let to_many = 'items' in assocProp[1],
      references = 'items' in assocProp[1] ? assocProp[1].items : assocProp[1],
      schemaName = "";
  if (Object.keys(references).includes('$ref')) {
    // there is a single reference to another schema
    schemaName = getSchemaName(references['$ref'])
    schemaName in relationMapping ? relationMapping[schemaName].push(PARENT) : relationMapping[schemaName] = [PARENT]
  }
  else if (Object.keys(references).includes('anyOf')) {
    // there are multiple types and or references (we don't use oneOf and allOf in ISA)
    // for loop with a recursive call ?
  }
  else if (Object.keys(references).includes('type') && references.type === 'object'){
    // this is a nested reference aka a reference to an object not contained in its own schema
    // we need to create a new schema for that field that will end up in a separate file.
  }
  return {[assocProp[0]]: relationTemplate(to_many, schemaName)}
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

function relationTemplate(toMany, schemaName) {
  return {
    type: toMany ? 'to_many' : 'to_one',
    target: schemaName,
    targetStorageType: "sql",
    targetKey: null,
    keyIn: null,
    label: null
  }
}

module.exports = {
  processProperties,
  processArray,
  processAssociation,
  processScalar,
  getSchemaName,
  relationMapping
}
