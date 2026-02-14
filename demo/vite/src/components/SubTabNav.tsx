import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface SubTab {
  id: string;
  label: string;
}

interface SubTabNavProps {
  tabs: readonly SubTab[];
  activeTab: string;
  onChange: (id: string) => void;
  children?: ReactNode;
}

export function SubTabNav({ tabs, activeTab, onChange, children }: SubTabNavProps) {
  return (
    <Tabs value={activeTab} onValueChange={onChange} className="flex flex-col h-full">
      <TabsList className="flex-shrink-0 mb-3">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children !== undefined && <TabsContent value={activeTab}>{children}</TabsContent>}
    </Tabs>
  );
}
