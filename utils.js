const processProperties = function(propertiesObj) {
  const props = Object.entries(propertiesObj);
  let zendroAttributes = props.reduce(
    (a, p) => {
      const propName = p[0];
      const propDef = p[1];
      let def;
      // identify type: association or scalar
      // and invoke handler
      if (propDef.type === "array") {
        def = processArray(propDef);
      } else if (!propDef.type || propDef.type === "object") {
        def = processAssociation(p);
      } else {
        def = processScalar(p);
      }
      return Object.assign(a, def);
    }, {});
  // Manually add an 'id' field:
  zendroAttributes["id"] = "String";
  console.log({
    zendroAttributes
  });
  return zendroAttributes;
}

const mapIsaTypeToZendroType = {
  "string": "String",
  "date-time": "DateTime",
  "number": "Float",
  "email": "String",
  "uri": "String"
}

const recognizeIsaType = function(propDef) {
  if (!propDef.format) {
    return mapIsaTypeToZendroType[propDef.type];
  } else {
    return mapIsaTypeToZendroType[propDef.format];
  }
}

const processArray = function(arrayProp) {
  // are you a scalar array?
  // if scalar, you'll become a Zendro "array-field", e.g. "[String]"
  // if object, you'll become a Zendro association 
}

const processAssociation = function(assocProp) {
  console.log(assocProp);
  // "proper Zendro assoc definition"
  // - need to split ISA union assocs (anyOf, oneOf, allOf) into separate
  // associations. 
}

const processScalar = function(scalarProp) {
  console.log(`Processing scalar ${scalarProp[0]}`);
  if (scalarProp[0] !== "@id") {
    const result = {
      [scalarProp[0]]: recognizeIsaType(scalarProp[1])
    }
    console.log(result)
    return result
  }
}

module.exports = {
  processProperties,
  processArray,
  processAssociation,
  processScalar
}
