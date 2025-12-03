import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/context/ThemeContext";
import { Users } from "lucide-react";

const members = [
    { name: "Fadli Hibatullah Dhafin Rahmanto Putra", nim: "4.32.23.1.09" },
    { name: "Nauval Daffa Azmiy", nim: "4.32.23.1.18" },
    { name: "Syalsabila Arbell Nathaniella", nim: "4.32.23.1.22" },
];

const TeamInfo = () => {
  const { theme } = useTheme();

  return (
    <Card className={`${theme.card} ${theme.text} mt-8`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6" />
          <CardTitle>Dibuat oleh Kelompok 7</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {members.map((member) => (
            <li key={member.nim} className="flex flex-col sm:flex-row justify-between">
              <span className="font-medium">{member.name}</span>
              <span className="text-slate-400 font-mono">{member.nim}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default TeamInfo;