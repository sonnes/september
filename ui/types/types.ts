export interface Message {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
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
