export type ChatMessage = { role: "system" | "user"; content: string };

export interface AIProvider {
  chat(messages: ChatMessage[]): Promise<string>;
}
