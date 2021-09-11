#include <tree_sitter/parser.h>

enum TOKEN_TYPE {
    STRING_CHAR_TEXT,
};

void *tree_sitter_hare_external_scanner_create(void) { return NULL; }
void tree_sitter_hare_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_hare_external_scanner_serialize(void *payload, char *buffer) { return 0; }
void tree_sitter_hare_external_scanner_deserialize(void *payload, char const *buffer, unsigned length) {}

bool tree_sitter_hare_external_scanner_scan(void *payload, TSLexer *lexer, bool const *valid_symbols)
{
    if (valid_symbols[STRING_CHAR_TEXT]) {
        int chars = 0;

		while (!lexer->eof(lexer)) {
			if (lexer->lookahead == '\\') {
				// escape_sequence
				break;
			}

			if (lexer->lookahead == '"') {
				// string's end
				break;
			}

			lexer->advance(lexer, false);
			++chars;
		}

		if (chars > 0) {
			lexer->result_symbol = STRING_CHAR_TEXT;
			return true;
		}
    }

    return false;
}
