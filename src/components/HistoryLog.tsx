import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock } from "lucide-react";

export interface HistoryEntry {
  timestamp: Date;
  message: string;
}

interface HistoryLogProps {
  entries: HistoryEntry[];
}

const HistoryLog = ({ entries }: HistoryLogProps) => {
  return (
    <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Riwayat Aktivitas</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48 w-full pr-4">
          <div className="space-y-4">
            {entries.length > 0 ? (
              [...entries].reverse().map((entry, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Clock className="w-4 h-4 mt-1 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-200">{entry.message}</p>
                    <p className="text-xs text-slate-400">
                      {entry.timestamp.toLocaleTimeString("id-ID")}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Belum ada aktivitas tercatat.</p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default HistoryLog;