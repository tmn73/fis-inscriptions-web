"use client";

import {useMutation, useQueryClient, useQuery} from "@tanstack/react-query";
import {Button} from "@/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {useState} from "react";
import {Zap, Loader2, RefreshCw} from "lucide-react";
import {Separator} from "@/components/ui/separator";
import {useRouter} from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";
import {Inscription} from "@/app/types";
import {colorBadgePerGender} from "@/app/lib/colorMappers";
import {UpdateEventDataModal} from "./UpdateEventDataModal";
import {isMixedEvent} from "@/app/lib/genderStatus";
import {useTranslations} from "next-intl";

interface InscriptionActionsMenuProps {
  inscription: Inscription;
  readonly: boolean;
}

export function InscriptionActionsMenu({
  inscription,
  readonly,
}: InscriptionActionsMenuProps) {
  const t = useTranslations("inscriptionDetail.actionsMenu");
  const tStatus = useTranslations("inscriptionDetail.actionsMenu.statusLabels");
  const tStatusDialog = useTranslations("inscriptionDetail.actionsMenu.statusDialog");
  const tGenderDialog = useTranslations("inscriptionDetail.actionsMenu.genderDialog");
  const tDeleteDialog = useTranslations("inscriptionDetail.actionsMenu.deleteDialog");

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [genderDialogOpen, setGenderDialogOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedStatusScope, setSelectedStatusScope] = useState<"men" | "women" | "both">("both");
  const queryClient = useQueryClient();
  const router = useRouter();

  const statusMutation = useMutation({
    mutationFn: async ({
      status,
      scope,
    }: {
      status: "open" | "validated" | "email_sent" | "cancelled" | "refused" | "not_concerned";
      scope?: "global" | "men" | "women" | "both";
    }) => {
      const res = await fetch(`/api/inscriptions/${inscription.id}/status`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({status, scope}),
      });
      if (!res.ok) throw new Error(t("errors.statusChange"));
      return res.json();
    },
    onSuccess: () => {
      // Invalidate inscription detail
      queryClient.invalidateQueries({
        queryKey: ["inscriptions", inscription.id.toString()],
      });
      // Invalidate inscriptions list (status filters, counts, etc.)
      queryClient.invalidateQueries({
        queryKey: ["inscriptions"],
      });
      setPopoverOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/inscriptions/${inscription.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(t("errors.delete"));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inscriptions", inscription.id.toString()],
      });
      queryClient.invalidateQueries({queryKey: ["inscriptions"]});
      setPopoverOpen(false);
      router.push("/");
    },
    onError: (error) => {
      alert(`${t("errors.delete")}: ${error.message}`);
      setPopoverOpen(false);
    },
  });

  const {
    data: competitors = [],
    isLoading: isLoadingCompetitors,
    refetch: refetchCompetitorsAll,
  } = useQuery({
    queryKey: ["inscription-competitors-all", inscription.id],
    queryFn: async () => {
      const res = await fetch(
        `/api/inscriptions/${inscription.id}/competitors/all`
      );
      if (!res.ok)
        throw new Error(t("errors.loadCompetitors"));
      return res.json();
    },
  });

  const handleStatusChange = () => {
    if (!selectedStatus) {
      setStatusDialogOpen(false);
      setSelectedStatus("");
      setSelectedStatusScope("both");
      return;
    }
    statusMutation.mutate({
      status: selectedStatus as "open" | "validated" | "email_sent" | "cancelled" | "refused" | "not_concerned",
      scope: selectedStatusScope,
    });
    setStatusDialogOpen(false);
    setSelectedStatus("");
    setSelectedStatusScope("both");
    setPopoverOpen(false);
  };


  const isEventMixed = isMixedEvent(inscription.eventData);

  const hasNoMen = !competitors.some((c: {gender: string}) => c.gender === "M");
  const hasNoWomen = !competitors.some(
    (c: {gender: string}) => c.gender === "W"
  );

  const handleGeneratePDF = () => {
    if (isEventMixed) {
      setGenderDialogOpen(true);
    } else {
      const gender = inscription.eventData.genderCodes[0];
      window.open(
        `/inscriptions/${inscription.id}/pdf?gender=${gender}`,
        "_blank"
      );
      setPopoverOpen(false);
    }
  };

  const handleGenderSelectedAndGeneratePDF = (gender: "M" | "W") => {
    window.open(
      `/inscriptions/${inscription.id}/pdf?gender=${gender}`,
      "_blank"
    );
    setGenderDialogOpen(false);
    setPopoverOpen(false);
  };

  const handleDelete = () => {
    if (window.confirm(tDeleteDialog("confirm"))) {
      deleteMutation.mutate();
    } else {
      setPopoverOpen(false);
    }
  };

  return (
    <Popover
      open={popoverOpen}
      onOpenChange={(open) => {
        if (open) {
          refetchCompetitorsAll();
        }
        setPopoverOpen(open);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="bg-emerald-600 hover:bg-emerald-700 text-white hover:text-white shadow-md flex items-center gap-2 w-24 cursor-pointer"
        >
          <Zap className="w-4 h-4" />
          {t("button")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2 flex flex-col gap-1 items-start text-left">
        <Button
          variant="ghost"
          className="justify-start w-full cursor-pointer"
          onClick={() => {
            setSelectedStatus("");
            setStatusDialogOpen(true);
            setPopoverOpen(false);
          }}
          disabled={statusMutation.isPending || readonly}
        >
          {t("changeStatus")}
        </Button>
        <Button
          variant="ghost"
          className="justify-start w-full cursor-pointer"
          onClick={handleGeneratePDF}
          disabled={
            readonly || isLoadingCompetitors || competitors.length === 0
          }
        >
          {isLoadingCompetitors && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {t("generatePdf")}
        </Button>

        {!readonly && (
          <Button
            variant="ghost"
            className="justify-start w-full cursor-pointer flex items-center gap-2"
            onClick={() => {
              setUpdateModalOpen(true);
              setPopoverOpen(false);
            }}
          >
            <RefreshCw className="w-4 h-4" />
            {t("updateData")}
          </Button>
        )}

        <Dialog open={genderDialogOpen} onOpenChange={setGenderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tGenderDialog("title")}</DialogTitle>
              <DialogDescription>
                {tGenderDialog("description")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:justify-center">
              {hasNoMen ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button
                          className={`${colorBadgePerGender.M} text-white cursor-not-allowed opacity-60`}
                          disabled
                          style={{pointerEvents: "none"}}
                        >
                          {tGenderDialog("men")}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tGenderDialog("noMen")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  onClick={() => handleGenderSelectedAndGeneratePDF("M")}
                  className={`cursor-pointer ${colorBadgePerGender.M} hover:${colorBadgePerGender.M}/90 text-white`}
                >
                  {tGenderDialog("men")}
                </Button>
              )}
              {hasNoWomen ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}>
                        <Button
                          className={`${colorBadgePerGender.W} text-white cursor-not-allowed opacity-60`}
                          disabled
                          style={{pointerEvents: "none"}}
                        >
                          {tGenderDialog("women")}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tGenderDialog("noWomen")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  onClick={() => handleGenderSelectedAndGeneratePDF("W")}
                  className={`cursor-pointer ${colorBadgePerGender.W} hover:${colorBadgePerGender.W}/90 text-white`}
                >
                  {tGenderDialog("women")}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {inscription.status !== "validated" && (
          <>
            <Separator className="my-1" />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("edit")}</DialogTitle>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            <Button
              variant="ghost"
              className="justify-start w-full text-red-600 hover:text-red-700 cursor-pointer"
              onClick={handleDelete}
              disabled={readonly || deleteMutation.isPending}
            >
              {t("delete")}
            </Button>
          </>
        )}
      </PopoverContent>

      <UpdateEventDataModal
        isOpen={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        inscription={inscription}
      />

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tStatusDialog("title")}</DialogTitle>
            <DialogDescription>
              {tStatusDialog("description")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{tStatusDialog("newStatus")}</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue placeholder={tStatusDialog("choosePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open" className="cursor-pointer">
                    {tStatus("open")}
                  </SelectItem>
                  <SelectItem value="validated" className="cursor-pointer">
                    {tStatus("validated")}
                  </SelectItem>
                  <SelectItem value="email_sent" className="cursor-pointer">
                    {tStatus("email_sent")}
                  </SelectItem>
                  <SelectItem value="cancelled" className="cursor-pointer">
                    {tStatus("cancelled")}
                  </SelectItem>
                  <SelectItem value="refused" className="cursor-pointer">
                    {tStatus("refused")}
                  </SelectItem>
                  <SelectItem value="not_concerned" className="cursor-pointer">
                    {tStatus("not_concerned")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isEventMixed && (
              <div>
                <label className="text-sm font-medium mb-2 block">{tStatusDialog("applyTo")}</label>
                <RadioGroup value={selectedStatusScope} onValueChange={(value: "men" | "women" | "both") => setSelectedStatusScope(value)} className="flex flex-row space-x-6">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="men" id="men" />
                    <Label htmlFor="men" className="cursor-pointer">{tStatusDialog("men")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="women" id="women" />
                    <Label htmlFor="women" className="cursor-pointer">{tStatusDialog("women")}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both" className="cursor-pointer">{tStatusDialog("both")}</Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setStatusDialogOpen(false);
                setSelectedStatus("");
                setSelectedStatusScope("both");
              }}
              className="cursor-pointer"
            >
              {tStatusDialog("cancel")}
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={
                !selectedStatus ||
                (() => {
                  // Pour les événements mixtes, vérifier selon le scope
                  if (isEventMixed) {
                    if (selectedStatusScope === "men") {
                      return selectedStatus === inscription.menStatus;
                    } else if (selectedStatusScope === "women") {
                      return selectedStatus === inscription.womenStatus;
                    } else if (selectedStatusScope === "both") {
                      return selectedStatus === inscription.menStatus &&
                             selectedStatus === inscription.womenStatus &&
                             selectedStatus === inscription.status;
                    }
                  }
                  // Pour les événements non-mixtes, vérifier le statut global
                  return selectedStatus === inscription.status;
                })() ||
                statusMutation.isPending
              }
              className="cursor-pointer"
            >
              {statusMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {tStatusDialog("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Popover>
  );
}
