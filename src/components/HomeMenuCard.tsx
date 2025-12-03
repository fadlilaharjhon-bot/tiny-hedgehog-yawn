import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface HomeMenuCardProps {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const HomeMenuCard = ({ to, icon, title, description }: HomeMenuCardProps) => {
  return (
    <Link to={to} className="group block">
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 text-white transition-all duration-300 hover:border-sky-400 hover:bg-slate-800/80 hover:-translate-y-2">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="p-3 bg-slate-700/50 rounded-lg mb-4 transition-transform duration-300 group-hover:animate-wiggle">
              {icon}
            </div>
            <ArrowRight className="w-5 h-5 text-slate-500 transition-transform duration-300 group-hover:translate-x-1" />
          </div>
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
          <CardDescription className="text-slate-400">{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
};

export default HomeMenuCard;