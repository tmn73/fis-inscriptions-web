"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Activity,
  Calendar,
  Users,
  UserPlus,
  Trophy,
  RefreshCw,
  Clock,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import {useTranslations} from "next-intl";
import {useDateLocale} from "@/app/lib/dateLocale";

type ActivityItem = {
  id: number;
  type: "inscription" | "competitor" | "coach";
  createdAt: string;
  eventData?: {
    eventName?: string;
    codexUrl?: string;
  };
  // Pour les inscriptions
  eventId?: number;
  status?: string;
  // Pour les compétiteurs
  inscriptionId?: number;
  competitorId?: number;
  codexNumber?: string;
  competitorFirstName?: string;
  competitorLastName?: string;
  competitorNation?: string;
  competitorFisCode?: string;
  // Pour les coaches
  firstName?: string;
  lastName?: string;
  team?: string;
  gender?: string;
};

type ActivityStats = {
  inscriptionsCount: number;
  competitorsCount: number;
  coachesCount: number;
  totalActivities: number;
};

type UserActivityModalProps = {
  userId: string;
  userName: string;
};

export const UserActivityModal = ({ userId, userName }: UserActivityModalProps) => {
  const t = useTranslations("modals.userActivity");
  const dateLocale = useDateLocale();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const fetchActivity = useCallback(async () => {
    if (!isOpen) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/activity`);
      if (!response.ok) throw new Error(t("loadError"));

      const data = await response.json();
      setActivities(data.activities);
      setStats(data.stats);
    } catch {
      toast({
        title: t("loadError"),
        description: t("loadErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isOpen, userId, toast, t]);

  useEffect(() => {
    if (isOpen) {
      fetchActivity();
    }
  }, [isOpen, fetchActivity]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "inscription":
        return <Calendar className="h-4 w-4" />;
      case "competitor":
        return <Users className="h-4 w-4" />;
      case "coach":
        return <UserPlus className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getEventDisplayName = (eventData: any, eventId?: number, inscriptionId?: number) => {
    // Essayer de récupérer les données de l'événement comme dans les emails
    const place = eventData?.place;
    const startDate = eventData?.startDate;
    const endDate = eventData?.endDate;

    if (place && startDate) {
      const dateDisplay = startDate === endDate ? startDate : `${startDate} → ${endDate}`;
      return `${place} (${dateDisplay})`;
    }

    // Fallback sur d'autres propriétés possibles
    const eventName = eventData?.eventName || eventData?.eventTitle || eventData?.title;
    if (eventName) return eventName;

    // Fallback final
    return `${t("event")} #${eventId || inscriptionId}`;
  };

  const getActivityDescription = (activity: ActivityItem) => {
    const eventName = getEventDisplayName(activity.eventData, activity.eventId, activity.inscriptionId);

    switch (activity.type) {
      case "inscription":
        return t("inscriptionCreated", {eventName});
      case "competitor":
        const competitorName = activity.competitorFirstName && activity.competitorLastName
          ? `${activity.competitorFirstName} ${activity.competitorLastName}`
          : `${t("competitor")} #${activity.competitorId}`;
        const nation = activity.competitorNation ? ` (${activity.competitorNation})` : '';
        const codex = activity.codexNumber ? ` [${activity.codexNumber}]` : '';
        return t("competitorAdded", {competitorName, nation, codex, eventName});
      case "coach":
        const team = activity.team ? ` (${activity.team})` : "";
        return t("coachAdded", {firstName: activity.firstName || "", lastName: activity.lastName || "", team, eventName});
      default:
        return t("unknownActivity");
    }
  };

  const getInscriptionLink = (activity: ActivityItem) => {
    const inscriptionId = activity.type === "inscription" ? activity.id : activity.inscriptionId;
    return inscriptionId ? `/inscriptions/${inscriptionId}` : null;
  };

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case "inscription":
        return "bg-blue-100 text-blue-800";
      case "competitor":
        return "bg-green-100 text-green-800";
      case "coach":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer"
        >
          <Activity className="h-4 w-4 mr-1" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-none !w-[85vw] max-h-[90vh] overflow-hidden flex flex-col" style={{ width: '85vw', maxWidth: 'none' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t("title", {userName})}
            <Badge variant="secondary" className="ml-2">
              {t("last30Days")}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          {/* Statistiques */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-lg">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 font-medium">{t("inscriptionsCreated")}</p>
                      <p className="text-3xl font-bold text-blue-900">{stats.inscriptionsCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-600 rounded-lg">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-green-700 font-medium">{t("competitorsAdded")}</p>
                      <p className="text-3xl font-bold text-green-900">{stats.competitorsCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-600 rounded-lg">
                      <UserPlus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-purple-700 font-medium">{t("coachesAdded")}</p>
                      <p className="text-3xl font-bold text-purple-900">{stats.coachesCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-600 rounded-lg">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-orange-700 font-medium">{t("totalActivities")}</p>
                      <p className="text-3xl font-bold text-orange-900">{stats.totalActivities}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Timeline des activités */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">{t("recentActivities")}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchActivity}
                disabled={loading}
                className="cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                  {t("loading")}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t("noActivity")}
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {activities.map((activity) => (
                    <div
                      key={`${activity.type}-${activity.id}`}
                      className="flex items-start gap-6 p-6 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <div className={`p-4 rounded-lg flex-shrink-0 ${getActivityBadgeColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-start gap-3">
                          <p className="text-base font-medium text-gray-900 leading-relaxed flex-1">
                            {getActivityDescription(activity)}
                          </p>
                          {getInscriptionLink(activity) && (
                            <Link
                              href={getInscriptionLink(activity)!}
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {t("view")}
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <p className="text-sm text-gray-500">
                            {formatDate(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge className={`${getActivityBadgeColor(activity.type)} text-sm px-3 py-1`}>
                          {activity.type === "inscription" ? t("inscription") :
                           activity.type === "competitor" ? t("competitor") : t("coach")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};