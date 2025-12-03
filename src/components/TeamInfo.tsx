import { useTheme } from "@/context/ThemeContext";
import { User } from "lucide-react";

const members = [
    { name: "Fadli Hibatullah Dhafin R. P.", nim: "4.32.23.1.09" },
    { name: "Nauval Daffa Azmiy", nim: "4.32.23.1.18" },
    { name: "Syalsabila Arbell Nathaniella", nim: "4.32.23.1.22" },
];

const TeamInfo = () => {
  const { theme } = useTheme();

  return (
    <div className="my-12">
      <h2 className={`text-3xl font-bold text-center mb-8 ${theme.header}`}>
        Kelompok 7
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {members.map((member) => (
          <div key={member.nim} className="flex flex-col items-center text-center">
            <div className="w-32 h-32 rounded-full bg-slate-700 flex items-center justify-center border-4 border-slate-600 mb-4 transition-transform duration-300 hover:scale-110">
              {/* Placeholder untuk foto, bisa diganti dengan tag <img> */}
              <User className="w-16 h-16 text-slate-400" />
            </div>
            <h3 className="font-bold text-lg">{member.name}</h3>
            <p className="text-slate-400 font-mono">{member.nim}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamInfo;