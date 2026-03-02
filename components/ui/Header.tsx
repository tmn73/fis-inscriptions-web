"use client";

import React, { useState } from "react";
import {
  PlusCircle,
  Snowflake,
  Users,
  Settings,
  Menu,
  ChevronDown,
  UserCheck,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "./button";
import { useRole, isAdminRole, isSuperAdminRole } from "@/app/lib/useRole";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
        ${
          active
            ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
            : "text-white/65 hover:text-white hover:bg-white/10"
        }
      `}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}

export const Header = () => {
  const { user, isLoaded } = useUser();
  const role = useRole();
  const t = useTranslations("inscriptions");
  const tNav = useTranslations("navigation");
  const tCommon = useTranslations("common.actions");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: organization } = useOrganization();
  const pathname = usePathname();

  const showAdminItems = isAdminRole(role);
  const showSuperAdminItems = isSuperAdminRole(role);

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <header className="relative z-10 py-4 md:py-5">
      <div className="flex items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 min-w-0 group">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <Snowflake className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 flex-shrink-0 transition-transform duration-300 group-hover:rotate-45" />
              <div className="absolute inset-0 bg-white/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">
                <span className="md:hidden">{t("titleShort")}</span>
                <span className="hidden md:inline">{t("title")}</span>
              </h1>
              {organization?.name && (
                <span className="hidden sm:block text-[10px] md:text-xs text-white/70 font-medium tracking-wider uppercase">
                  {organization.name}
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Mobile: CTA always visible */}
          <SignedIn>
            <Link href="/inscriptions/new" className="md:hidden">
              <Button
                size="sm"
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg shadow-blue-900/15 h-9 px-3 font-semibold rounded-lg"
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t("new")}</span>
              </Button>
            </Link>
          </SignedIn>

          {/* Desktop navigation (lg+) */}
          <nav className="hidden lg:flex items-center gap-2.5">
            <div className="flex items-center gap-0.5 bg-white/[0.07] backdrop-blur-sm rounded-xl p-1 border border-white/[0.06]">
              <NavItem
                href="/competitors"
                icon={UserCheck}
                label={tNav("competitors")}
                active={isActive("/competitors")}
              />
              <SignedIn>
                {showAdminItems && (
                  <NavItem
                    href="/stats"
                    icon={BarChart3}
                    label={tNav("stats")}
                    active={isActive("/stats")}
                  />
                )}
                {showAdminItems && (
                  <NavItem
                    href="/users"
                    icon={Users}
                    label={tNav("users")}
                    active={isActive("/users")}
                  />
                )}
                {showSuperAdminItems && (
                  <NavItem
                    href="/admin/organization"
                    icon={Settings}
                    label="Config"
                    active={isActive("/admin/organization")}
                  />
                )}
              </SignedIn>
            </div>

            <SignedIn>
              <Link href="/inscriptions/new">
                <button className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 active:bg-blue-100 shadow-lg shadow-blue-900/20 font-semibold rounded-xl h-10 px-5 text-sm transition-colors duration-200">
                  <PlusCircle className="h-4 w-4" />
                  {t("new")}
                </button>
              </Link>
            </SignedIn>
          </nav>

          {/* Tablet navigation (md to lg) */}
          <nav className="hidden md:flex lg:hidden items-center gap-1.5">
            <div className="flex items-center gap-0.5 bg-white/[0.07] backdrop-blur-sm rounded-xl p-1 border border-white/[0.06]">
              <NavItem
                href="/competitors"
                icon={UserCheck}
                label={tNav("competitors")}
                active={isActive("/competitors")}
              />
              <SignedIn>
                {(showAdminItems || showSuperAdminItems) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-white/65 hover:text-white hover:bg-white/10 transition-all duration-200 outline-none">
                        Admin
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {showAdminItems && (
                        <DropdownMenuItem asChild>
                          <Link
                            href="/stats"
                            className="flex items-center cursor-pointer"
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            {tNav("stats")}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {showAdminItems && (
                        <DropdownMenuItem asChild>
                          <Link
                            href="/users"
                            className="flex items-center cursor-pointer"
                          >
                            <Users className="mr-2 h-4 w-4" />
                            {tNav("users")}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {showSuperAdminItems && (
                        <DropdownMenuItem asChild>
                          <Link
                            href="/admin/organization"
                            className="flex items-center cursor-pointer"
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Config
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </SignedIn>
            </div>

            <SignedIn>
              <Link href="/inscriptions/new">
                <button className="flex items-center gap-1.5 bg-white text-blue-600 hover:bg-blue-50 active:bg-blue-100 shadow-lg shadow-blue-900/15 font-semibold rounded-xl h-9 px-4 text-sm transition-colors duration-200">
                  <PlusCircle className="h-4 w-4" />
                  {t("new")}
                </button>
              </Link>
            </SignedIn>
          </nav>

          {/* Separator */}
          <div className="hidden md:block h-6 w-px bg-white/15" />

          {/* Utility: language + auth */}
          <div className="flex items-center gap-1">
            <LanguageSwitcher />

            {isLoaded && user ? (
              <UserButton />
            ) : (
              <Link href="/sign-in">
                <Button
                  size="sm"
                  className="bg-white/10 text-white hover:bg-white/20 border border-white/20 rounded-lg"
                >
                  {tCommon("signIn")}
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="md:hidden text-white/90 hover:text-white hover:bg-white/10 h-9 w-9 p-0"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 mt-6">
                <Link
                  href="/competitors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-accent"
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    {tNav("competitors")}
                  </Button>
                </Link>
                <SignedIn>
                  {showAdminItems && (
                    <Link
                      href="/stats"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start hover:bg-accent"
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        {tNav("stats")}
                      </Button>
                    </Link>
                  )}
                  {showAdminItems && (
                    <Link
                      href="/users"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start hover:bg-accent"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        {tNav("users")}
                      </Button>
                    </Link>
                  )}
                  {showSuperAdminItems && (
                    <Link
                      href="/admin/organization"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start hover:bg-accent"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Config
                      </Button>
                    </Link>
                  )}
                </SignedIn>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
