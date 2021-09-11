[
	"abort"
	"alloc"
	"append"
	"as"
	"assert"
	"bool"
	"break"
	"char"
	"const"
	"continue"
	"def"
	"defer"
	"delete"
	"else"
	"enum"
	"export"
	"f32"
	"f64"
	"false"
	"fn"
	"for"
	"free"
	"i16"
	"i32"
	"i64"
	"i8"
	"if"
	"int"
	"is"
	"len"
	"let"
	"match"
	"null"
	"nullable"
	"offset"
	"return"
	"rune"
	"size"
	"static"
	; "str"
	"struct"
	"switch"
	"true"
	"type"
	"u16"
	"u32"
	"u64"
	"u8"
	"uint"
	"uintptr"
	"union"
	"use"
	"void"
	"_"
] @keyword

(comment) @comment

(use_statement [
    (identifier (name) @namespace)
    (name_list (name) @type)
])

(type_bindings [
    (identifier (name) @namespace . (name) @type)
    (identifier (name) @type)
])

(struct_union_field [
    (name) @field
    (identifier (name) @namespace . (name) @type)
    (identifier (name) @type)
    (_
        (identifier (name) @namespace . (name) @type)
        (identifier (name) @type)
    )
])

(function_declaration
    (name) @function
    (prototype [
        (parameter_list (parameter [
            (name) @parameter
            (identifier (name) @namespace . (name) @type)
            (identifier (name) @type)
            (_
                (identifier (name) @namespace . (name) @type)
                (identifier (name) @type)
            )
        ]))
        (identifier (name) @namespace . (name) @type)
        (identifier (name) @type)
        (_
            (identifier (name) @namespace . (name) @type)
            (identifier (name) @type)
        )
    ])
)


(binding_list (binding (name) @variable))

(struct_literal 
    (identifier (name) @type)
    (struct_initializer) @field
)

(call_expression [
    (identifier (name) @function)
    (argument_list (identifier (name) @parameter))
])

(field_access_expression [
    (identifier (name) @variable)
    (name) @field
])
