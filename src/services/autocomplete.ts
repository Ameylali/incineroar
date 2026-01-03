class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
  }

  getAllChildWords(prefix: string = ''): string[] {
    let results: string[] = [];
    if (this.isEndOfWord) {
      results.push(prefix);
    }
    for (const [char, childNode] of this.children) {
      results = results.concat(childNode.getAllChildWords(prefix + char));
    }
    return results;
  }
}

class Trie {
  private root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isEndOfWord = true;
  }

  find(word: string): boolean {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }
    return node.isEndOfWord;
  }

  getAllSuggestions(word: string): string[] {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        return [];
      }
      node = node.children.get(char)!;
    }
    return node.getAllChildWords(word);
  }
}

export default class AutocompleteService {
  private trie: Trie;

  constructor(words: string[]) {
    this.trie = new Trie();
    for (const word of words) {
      this.trie.insert(word.toLowerCase());
    }
  }

  hasWord(word: string): boolean {
    return this.trie.find(word.toLowerCase());
  }

  getSuggestions(prefix: string): string[] {
    return this.trie.getAllSuggestions(prefix.toLowerCase());
  }
}
