declare module 'nspell' {
  interface NSpellOptions {
    aff: string;
    dic: string;
  }

  interface NSpell {
    correct(word: string): boolean;
    suggest(word: string): string[];
    spell(word: string): boolean;
    add(word: string): void;
    remove(word: string): void;
    wordCharacters(): string;
    dictionary(dictionary: string): void;
    personal(personal: string): void;
  }

  function nspell(options: NSpellOptions): NSpell;
  export = nspell;
}
