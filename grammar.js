const PREC = {
    LOGICAL_XOR: 1,
    LOGICAL_OR: 2,
    LOGICAL_AND: 3,
    BITWISE_OR: 4,
    BITWISE_XOR: 5,
    BITWISE_AND: 6,
    EQUALITY: 7,
    COMPARISON: 8,
    SHIFT: 9,
    ADD: 10,
    MULTIPLY: 11,
    CAST: 12,
    UNARY: 13,
};

const cho = choice;
const opt = optional;
const re0 = repeat;
const re1 = repeat1;

module.exports = grammar({
    name: "hare",
    inline: $ => [
        $.imports,
        $.storage_class,
        $.struct_union_fields,
        $.parameters,
        $.constant,
        $.string_chars,
        $.string_char,
        $.type,
        $.scalar_type,
        $.bindings,
        $.expression,
        $.nested_expression,
        $.plain_expression,
        $.declaration,
        $.alias_type,
        $.tagged_union_type,
        // $.binding_list,
        $.match_cases,
        $.postfix_expression,
        $.builtin_expression,
    ],
    extras: $ => [
        /\s/,
        $.comment,
    ],
    conflicts: $ => [
        [$.identifier], // use xx::aa::{foo, bar};
        [$.floating_constant, $.integer_constant],
        [$.slice_mutation_expression, $.object_selector],
        [$.for_predicate, $.expression],
        [$.if_expression],
        [$.field_values],
        [$.struct_initializer],
        [$.identifier, $.function_declaration],
    ],
    externals: $ => [
        $.string_char_text,
    ],
    rules: {
        // HACK: 6.10
        sub_unit: $ => seq(opt($.imports), opt($.declarations)),
        imports: $ => re1($.use_statement),
        use_statement: $ => cho(
            seq("use", $.identifier, ";"),
            seq("use", $.name, "=", $.identifier, ";"),
            seq("use", $.identifier, "::", "{", $.name_list, "}", ";"),
        ),
        name_list: $ => seq($.name, re0(seq(",", $.name)), opt(",")),

        comment: () => /\/\/.*/,

        // HACK: 6.4
        identifier: $ => seq($.name, re0(seq("::", $.name))),
        name: () => /[a-zA-Z_]\w*/,

        // HACK: 6.5
        type: $ => seq(opt("const"), opt("!"), $.storage_class),
        storage_class: $ => cho(
            $.scalar_type,
            $.struct_union_type,
            $.tuple_type,
            $.tagged_union_type,
            $.slice_array_type,
            $.function_type,
            $.alias_type,
            $.unwrapped_alias,
            $.string_type
        ),
        scalar_type: $ => cho(
            $.integer_type,
            $.floating_type,
            $.enum_type,
            $.pointer_type,
            "rune",
            "bool",
            "void"
        ),

        // HACK: 6.5.9
        integer_type: () => cho(
            "i8", "i16", "i32", "i64",
            "u8", "u16", "u32", "u64",
            "int", "uint", "size", "uintptr", "char"
        ),

        // HACK: 6.5.10
        floating_type: () => cho("f32", "f64"),

        // HACK: 6.5.12
        enum_type: $ => seq(
            "enum", opt($.integer_type), "{", $.enum_values, "}"
        ),
        enum_values: $ => seq(
            $.enum_value, re0(seq(",", $.enum_value)), opt(",")
        ),
        enum_value: $ => seq($.name, opt(seq("=", $.expression))),

        // HACK: 6.5.13
        pointer_type: $ => seq(opt("nullable"), "*", $.type),

        // HACK: 6.5.15
        struct_union_type: $ => seq(
            cho("struct", "union"), "{", $.struct_union_fields, "}"
        ),
        struct_union_fields: $ => seq(
            $.struct_union_field,
            re0(seq(",", $.struct_union_field)),
            opt(",")
        ),
        struct_union_field: $ => cho(
            seq(opt($.offset_specifier), $.name, ":", $.type),
            seq(opt($.offset_specifier), $.struct_union_type),
            seq(opt($.offset_specifier), $.identifier)
        ),
        offset_specifier: $ => seq("@offset", "(", $.expression, ")"),

        // HACK: 6.5.16
        tuple_type: $ => seq("(", $.tuple_types, ")"),
        tuple_types: $ => seq($.type, re1(seq(",", $.type)), opt(",")),

        // HACK: 6.5.17
        tagged_union_type: $ => seq("(", $.tagged_types, ")"),
        tagged_types: $ => seq($.type, re1(seq("|", $.type)), opt("|")),

        // HACK: 6.5.18
        slice_array_type: $ => cho(
            seq("[", "]", $.type),
            seq("[", $.expression, "]", $.type),
            seq("[", "*", "]", $.type),
            seq("[", "_", "]", $.type)
        ),

        // HACK: 6.5.19
        string_type: () => "str",

        // HACK: 6.5.20
        function_type: $ => seq(opt($.fntype_attr), "fn", $.prototype),
        prototype: $ => seq("(", opt($.parameter_list), ")", $.type),
        fntype_attr: () => "@noreturn",
        parameter_list: $ => cho(
            seq($.parameters, opt(",")),
            seq($.parameters, "...", opt(",")),
            seq($.parameters, ",", "...", opt(",")),
        ),
        parameters: $ => seq($.parameter, re0(seq(",", $.parameter))),
        parameter: $ => seq(cho($.name, "_"), ":", $.type),

        // HACK: 6.5.21
        alias_type: $ => $.identifier,
        unwrapped_alias: $ => seq("...", $.identifier),

        // HACK: 6.6.6
        constant: $ => cho(
            $.integer_constant,
            $.floating_constant,
            $.rune_constant,
            $.string_constant,
            "true",
            "false",
            "null",
            "void"
        ),

        // HACK: 6.6.7
        floating_constant: $ => seq(
            $._decimal_digits,
            opt(seq(".", $._decimal_digits)),
            opt($.exponent),
            opt($.floating_suffix)
        ),
        floating_suffix: () => cho("f32", "f64"),
        _decimal_digits: () => /\d+/,
        exponent: $ => seq($.exponent_char, opt($.sign), $._decimal_digits),
        sign: () => /[\+\-]/,
        exponent_char: () => /[eE]/,

        // HACK: 6.6.10
        integer_constant: $ => cho(
            seq("0x", $._hex_digits, opt($.integer_suffix)),
            seq("0o", $._octal_digits, opt($.integer_suffix)),
            seq("0b", $._binary_digits, opt($.integer_suffix)),
            seq($._decimal_digits, opt($.exponent), opt($.integer_suffix))
        ),
        _hex_digits: () => /[0-9a-fA-F]+/,
        _hex_digit: () => /[0-9a-fA-F]/,
        _octal_digits: () => /[0-7]+/,
        _binary_digits: () => /[0-1]+/,
        integer_suffix: () => cho(
            "i", "u", "z",
            "i8", "i16", "i32", "i64",
            "u8", "u16", "u32", "u64"
        ),

        // HACK: 6.6.15
        rune_constant: $ => seq("'", $.rune, "'"),
        rune: $ => cho(/[^\\']/, $.escape_sequence),
        escape_sequence: $ => cho(
            $.named_escape,
            seq("\\x", $._hex_digit, $._hex_digit),
            seq("\\u", $.fourbyte),
            seq("\\U", $.eightbyte)
        ),
        fourbyte: $ => seq(
            $._hex_digit, $._hex_digit, $._hex_digit, $._hex_digit
        ),
        eightbyte: $ => seq($.fourbyte, $.fourbyte),
        named_escape: () => cho(
            "\\0", "\\a", "\\b", "\\f", "\\n", "\\r", "\\t", "\\v",
            "\\\\", "\\'", "\\\""
        ),

        // HACK: 6.6.16
        string_constant: $ => re1(seq(
            "\"", opt($.string_chars), "\""
        )), // PR 
        string_chars: $ => re1($.string_char),
        string_char: $ => cho($.string_char_text, $.escape_sequence),

        // HACK: 6.6.17
        array_literal: $ => seq("[", opt($.array_members), "]"),
        _internal_array_members: $ => seq($.expression, opt("...")),
        array_members: $ => seq(
            $._internal_array_members,
            re0(seq(",", $._internal_array_members)),
            opt(",")
        ),

        // HACK: 6.6.18
        enum_literal: $ => seq($.identifier, "::", $.name),

        // HACK: 6.6.19
        struct_literal: $ => cho(
            seq("struct", "{", $.field_values, opt(","), "}"),
            seq($.identifier, "{", $.struct_initializer, opt(","), "}")
        ),
        struct_initializer: $ => cho(
            $.field_values,
            seq($.field_values, ",", "..."),
            "..."
        ),
        field_values: $ => seq(
            $.field_value, re0(seq(",", $.field_value))
        ),
        field_value: $ => cho(
            seq($.name, "=", $.expression),
            seq($.name, ":", $.type, "=", $.expression),
            $.struct_literal
        ),

        // HACK: 6.6.20
        plain_expression: $ => cho(
            $.identifier,
            $.constant,
            $.array_literal,
            $.enum_literal,
            $.struct_literal
        ),
        nested_expression: $ => cho(
            $.plain_expression,
            seq("(", cho($.expression, $.tuple_items), ")"),
        ),
        tuple_items: $ => seq(
            $.expression, re1(seq(",", $.expression)), opt(",")
        ),

        // HACK: 6.6.21
        allocation_expression: $ => cho(
            seq(
                "alloc",
                "(",
                $.expression,
                opt(seq(",", $.expression)),
                ")"
            ),
            seq(
                "free",
                "(",
                $.expression,
                ")"
            )
        ),

        // HACK: 6.6.22
        assertion_expression: $ => cho(
            seq(
                opt("static"),
                "assert",
                "(",
                $.expression,
                opt(seq(",", $.string_constant)), 
                ")"
            ),
            seq(
                opt("static"),
                "abort",
                "(",
                opt($.string_constant),
                ")"
            ),
        ),

        // HACK: 6.6.23
        call_expression: $ => seq(
            $.postfix_expression, "(", opt($.argument_list), ")"
        ),
        _argument_list: $ => seq(
            $.expression, opt("...")
        ),
        argument_list: $ => seq(
            $._argument_list, re0(seq(",", $._argument_list)), opt(",")
        ),

        // HACK: 6.6.24
        measurement_expression: $ => cho(
            $.size_expression,
            $.length_expression,
            $.offset_expression
        ),
        size_expression: $ => seq("size", "(", $.type, ")"),
        length_expression: $ => seq("len", "(", $.expression, ")"),
        offset_expression: $ => seq(
            "offset", "(", $.field_access_expression, ")"
        ),

        // HACK: 6.6.25
        field_access_expression: $ => seq(
            $.postfix_expression, ".", cho($.name, $.integer_constant)
        ),

        // HACK: 6.6.26
        indexing_expression: $ => seq(
            $.postfix_expression, "[", $.expression, "]"
        ),

        // HACK: 6.6.27
        slicing_expression: $ => seq(
            $.postfix_expression,
            "[",
            opt($.expression),
            "..",
            opt($.expression),
            "]"
        ),

        // HACK: 6.6.28
        slice_mutation_expression: $ => cho(
            seq(
                opt("static"),
                "append",
                "(",
                $.object_selector,
                ",",
                $.append_values,
                ")"
            ),
            seq(
                opt("static"),
                "delete",
                "(",
                $.indexing_expression,
                ")"
            ),
            seq(
                opt("static"),
                "delete",
                "(",
                $.object_selector,
                ")"
            ),
            seq(
                opt("static"),
                "delete",
                "(",
                $.slicing_expression,
                ")"
            ), // PR ?
            seq(
                opt("static"),
                "insert",
                "(",
                $.indexing_expression,
                ",",
                $.append_values,
                ")"
            )
        ),
        append_values: $ => cho(
            seq($.expression, opt(",")),
            seq($.expression, "...", opt(",")),
            seq($.expression, ",", $.append_values)
        ),

        // HACK: 6.6.29
        error_propagation: $ => seq($.postfix_expression, cho("?", "!")),

        // HACK: 6.6.30
        postfix_expression: $ => cho(
            $.nested_expression,
            $.call_expression,
            $.field_access_expression,
            $.indexing_expression,
            $.slicing_expression,
            $.error_propagation
        ),
        object_selector: $ => cho(
            $.identifier,
            $.indexing_expression,
            $.field_access_expression
        ),

        // HACK: 6.6.31
        builtin_expression: $ => cho(
            $.allocation_expression,
            $.assertion_expression,
            $.deferred_expression,
            $.measurement_expression,
            $.slice_mutation_expression,
            $.postfix_expression
        ),

        // HACK: 6.6.32
        _unary_expression: $ => prec.right(PREC.UNARY, seq(
            re0(/[\+\-\~\!\*\&]/), $.builtin_expression
        )),

        // HACK: 6.6.33
        _cast_expression: $ => prec.right(PREC.CAST, seq(
            $._unary_expression,
            re0(seq(cho(":", "as", "is"), $.type))
        )),

        // HACK: 6.6.34
        _multiplicative_expression: $ => prec.right(PREC.MULTIPLY, seq(
            $._cast_expression,
            re0(seq(cho("*", "/", "%"), $._cast_expression))
        )),

        // HACK: 6.6.35
        _additive_expression: $ => prec.right(PREC.ADD, seq(
            $._multiplicative_expression,
            re0(seq(cho("+", "-"), $._multiplicative_expression))
        )),

        // HACK: 6.6.36
        _shift_expression: $ => prec.right(PREC.SHIFT, seq(
            $._additive_expression,
            re0(seq(cho("<<", ">>"), $._additive_expression))
        )),

        // HACK: 6.6.37
        _and_expression: $ => prec.right(PREC.BITWISE_AND, seq(
            $._shift_expression,
            re0(seq("&", $._shift_expression))
        )),
        _exclusive_or_expression: $ => prec.right(PREC.BITWISE_XOR, seq(
            $._and_expression,
            re0(seq("^", $._and_expression))
        )),
        _inclusive_or_expression: $ => prec.right(PREC.BITWISE_OR, seq(
            $._exclusive_or_expression,
            re0(seq("|", $._exclusive_or_expression))
        )),

        // HACK: 6.6.38
        _comparison_expression: $ => prec.right(PREC.COMPARISON, seq(
            $._inclusive_or_expression,
            re0(seq(cho("<", ">", "<=", ">="), $._inclusive_or_expression))
        )),
        _equality_expression: $ => prec.right(PREC.EQUALITY, seq(
            $._comparison_expression,
            re0(seq(cho("==", "!="), $._comparison_expression))
        )),

        // HACK: 6.6.39
        _logical_and_expression: $ => prec.right(PREC.LOGICAL_AND, seq(
            $._equality_expression,
            re0(seq("&&", $._equality_expression))
        )),
        _logical_xor_expression: $ => prec.right(PREC.LOGICAL_XOR, seq(
            $._logical_and_expression,
            re0(seq("^^", $._logical_and_expression))
        )),
        _logical_or_expression: $ => prec.right(PREC.LOGICAL_OR, seq(
            $._logical_xor_expression,
            re0(seq("||", $._logical_xor_expression))
        )),

        // HACK: 6.6.40
        _internal_if_expression: $ => seq(
            "if", $.conditional_branch
        ),
        if_expression: $ => seq(
            $._internal_if_expression, re0(seq(
                "else", cho($._internal_if_expression, $.expression)
            ))
        ),
        conditional_branch: $ => seq("(", $.expression, ")", $.expression),

        // HACK: 6.6.41
        for_loop: $ => seq("for", "(", $.for_predicate, ")", $.expression),
        for_predicate: $ => cho(
            $.expression,
            seq($.binding_list, ";", $.expression),
            seq($.expression, ";", $.expression),
            seq($.binding_list, ";", $.expression, ";", $.expression)
        ),

        // HACK: 6.6.42
        switch_expression: $ => seq(
            "switch", "(", $.expression, ")", "{", $.switch_cases, "}"
        ),
        switch_cases: $ => seq(
            $.switch_case, re0(seq(",", $.switch_case)), opt(",")
        ),
        switch_case: $ => seq(cho($.case_options, "*"), "=>", $.expression),
        case_options: $ => seq(
            $.expression, re0(seq(",", $.expression)), opt(",")
        ),

        // HACK: 6.6.43
        match_expression: $ => seq(
            "match", "(", $.expression, ")", "{", $.match_cases, "}"
        ),
        match_cases: $ => seq(
            $.match_case, re0(seq(",", $.match_case)), opt(",")
        ),
        match_case: $ => seq(
            cho(
                seq($.name, ":", $.type),
                $.type,
                "*"
            ),
            "=>",
            $.expression
        ),

        // HACK: 6.6.44
        assignment: $ => cho(
            seq($.object_selector, $.assignment_op, $.expression),
            seq(/*"*",*/$._unary_expression, $.assignment_op, $.expression), // TODO: PR
            seq($.slicing_expression, "=", $.expression)
        ),
        assignment_op: () => cho(
            "=", "+=", "-=", "*=", "/=", "%=",
            "<<=", ">>=", "&=", "|=", "^=",
            "&&=", "||=", "^^=",
        ),

        // HACK: 6.6.45
        binding_list: $ => seq(
            opt("static"), cho("let", "const"), $.bindings
        ),
        bindings: $ => prec.right(seq(
            $.binding, re0(seq(",", $.binding)), opt(",")
        )),
        binding: $ => cho(
            seq($.name, "=", $.expression),
            seq($.name, ":", $.type, "=", $.expression),
            seq("(", $.binding_names, ")", "=", $.expression),
            seq("(", $.binding_names, ")", ":", $.type, "=", $.expression),

        ),
        binding_names: $ => seq($.name, re1(seq(",", $.name))),

        // HACK: 6.6.46
        deferred_expression: $ => seq("defer", $.expression),

        // HACK: 6.6.47
        expression_list: $ => re1(seq($.expression, ";")),
        compound_expression: $ => seq(
            opt($.label), "{", $.expression_list, "}"
        ),
        label: $ => seq(":", $.name),

        // HACK: 6.6.48
        control_expression: $ => prec.right(cho(
            seq("break", opt($.label)),
            seq("continue", opt($.label)),
            seq("return", opt($.expression)),
            $.yield_expression,
        )),
        yield_expression: $ => prec.right(cho(
            "yield",
            seq("yield", $.expression),
            seq("yield", $.label),
            seq("yield", $.label, ",", $.expression),
        )),

        // HACK: 6.6.49
        expression: $ => cho(
            $.assignment,
            $.binding_list,
            $._logical_or_expression,
            $.if_expression,
            $.for_loop,
            $.switch_expression,
            $.match_expression,
            $.control_expression,
            $.compound_expression
        ),

        // HACK: 6.9
        declarations: $ => re1(seq(opt("export"), $.declaration, ";")),
        declaration: $ => cho(
            $.global_declaration,
            $.constant_declaration,
            $.type_declaration,
            $.function_declaration
        ),

        // HACK: 6.9.3
        global_declaration: $ => cho(
            seq("let", $._global_bindings),
            seq("const", $._global_bindings),
        ),
        global_declaration: $ => seq(cho("let", "const"), $._global_bindings),
        _global_bindings: $ => seq(
            $.global_binding, re0(seq(",", $.global_binding)), opt(",")
        ),
        global_binding: $ => cho(
            seq(
                opt($.decl_attr),
                $.identifier,
                ":",
                $.type
            ),
            seq(
                opt($.decl_attr),
                $.identifier,
                ":",
                $.type,
                "=",
                $.expression
            )
        ),
        decl_attr: $ => seq("@symbol", "(", $.string_constant, ")"),

        // HACK: 6.9.4
        constant_declaration: $ => seq("def", $.constant_bindings),
        constant_bindings: $ => seq(
            $.constant_binding, re0(seq(",", $.constant_binding)), opt(",")
        ),
        constant_binding: $ => seq(
            $.identifier, ":", $.type, "=", $.expression
        ),

        // HACK: 6.9.5
        type_declaration: $ => seq("type", $.type_bindings),
        _internal_type_bindings: $ => seq($.identifier, "=", $.type),
        type_bindings: $ => seq(
            $._internal_type_bindings,
            re0(seq(",", $._internal_type_bindings)),
            opt(",")
        ),

        // HACK: 6.9.6
        function_declaration: $ => cho(
            seq(
                opt($.fndec_attrs),
                "fn",
                $.identifier,
                $.prototype
            ),
            seq(
                opt($.fndec_attrs),
                "fn",
                $.name,
                $.prototype,
                "=",
                $.expression
            ),
        ),
        fndec_attrs: $ => re1($.fndec_attr),
        fndec_attr: $ => cho(
            "@fini",
            "@init",
            "@test",
            $.fntype_attr,
            $.decl_attr
        ),
    }
})
