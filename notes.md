# TODO LIST:

- in protocol schema manualy create the "components" relationship and the corresponding file.

```
component model
"properties": {
		"componentName": {
				"type": "string"
		},
		"componentType": {
				"$ref": "ontology_annotation_schema.json#"
		},
		"comments" : {
				"type": "array",
				"items": {
							"$ref": "comment_schema.json#"
				}
		}
}
```

- manually curate `x_to_many` relations
