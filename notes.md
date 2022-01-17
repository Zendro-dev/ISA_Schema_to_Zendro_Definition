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

## Notes concerning manual revision of the data model definitions

Meeting on Monday January 17th, 2022.

Participants:
* Philipp
* Dominique
* Dan
* Constantin
* Asis

Notes / minutes:

* Currently _all_ associations are using foreign key arrays, even if they are
  `to_one` associations. This can be fixed at the end.
