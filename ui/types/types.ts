export interface Message {
  id: string;
  sender: string;
  content: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDetailProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
}

export interface NavigationItem {
  name: string;
  icon: string;
  href: string;
}

export interface NavigationData {
  items: NavigationItem[];
}
