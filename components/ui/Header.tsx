"use client";

import React, { useState } from "react";
import { PlusCircle, Snowflake, Users, Settings, Menu, ChevronDown } from "lucide-react";
import Link from "next/link";
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

export const Header = () => {
  const { user, isLoaded } = useUser();
  const role = useRole();
  const t = useTranslations("inscriptions");
  const tNav = useTranslations("navigation");
  const tCommon = useTranslations("common.actions");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: organization } = useOrganization();

  const showAdminItems = isAdminRole(role);
  const showSuperAdminItems = isSuperAdminRole(role);

  return (
    <header className="relative z-10 py-4 md:py-6">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
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

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Mobile: New request button (always visible when signed in) */}
          <SignedIn>
            <Link href="/inscriptions/new" className="md:hidden">
              <Button size="sm" className="bg-white/95 text-blue-600 hover:bg-white shadow-lg shadow-black/10 h-9 px-3 font-semibold">
                <PlusCircle className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t("new")}</span>
              </Button>
            </Link>
          </SignedIn>

          {/* Desktop navigation (lg+) */}
          <nav className="hidden lg:flex items-center gap-1">
            <SignedIn>
              <Link href="/inscriptions/new">
                <Button className="bg-white/95 text-blue-600 hover:bg-white shadow-lg shadow-black/10 font-semibold">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t("new")}
                </Button>
              </Link>
              {showAdminItems && (
                <Link href="/users">
                  <Button variant="ghost" className="text-white/90 hover:text-white hover:bg-white/10">
                    <Users className="mr-2 h-4 w-4" />
                    {tNav("users")}
                  </Button>
                </Link>
              )}
              {showSuperAdminItems && (
                <Link href="/admin/organization">
                  <Button variant="ghost" className="text-white/90 hover:text-white hover:bg-white/10">
                    <Settings className="mr-2 h-4 w-4" />
                    Config
                  </Button>
                </Link>
              )}
            </SignedIn>
          </nav>

          {/* Tablet navigation (md to lg) */}
          <nav className="hidden md:flex lg:hidden items-center gap-1">
            <SignedIn>
              <Link href="/inscriptions/new">
                <Button size="sm" className="bg-white/95 text-blue-600 hover:bg-white shadow-lg shadow-black/10 font-semibold">
                  <PlusCircle className="mr-1.5 h-4 w-4" />
                  {t("new")}
                </Button>
              </Link>
              {(showAdminItems || showSuperAdminItems) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-white/90 hover:text-white hover:bg-white/10">
                      Admin
                      <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {showAdminItems && (
                      <DropdownMenuItem asChild>
                        <Link href="/users" className="flex items-center cursor-pointer">
                          <Users className="mr-2 h-4 w-4" />
                          {tNav("users")}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {showSuperAdminItems && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/organization" className="flex items-center cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          Config
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </SignedIn>
          </nav>

          <LanguageSwitcher />

          {isLoaded && !user ? (
            <Link href="/sign-in">
              <Button size="sm" className="bg-white/10 text-white hover:bg-white/20 border border-white/20">
                {tCommon("signIn")}
              </Button>
            </Link>
          ) : isLoaded && user ? (
            <UserButton />
          ) : (
            <Link href="/sign-in">
              <Button size="sm" className="bg-white/10 text-white hover:bg-white/20 border border-white/20">
                {tCommon("signIn")}
              </Button>
            </Link>
          )}

          {/* Mobile admin menu (< md, only if admin) */}
          <SignedIn>
            {(showAdminItems || showSuperAdminItems) && (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" variant="ghost" className="md:hidden text-white/90 hover:text-white hover:bg-white/10 h-9 w-9 p-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px]">
                  <SheetHeader>
                    <SheetTitle>Admin</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-2 mt-6">
                    {showAdminItems && (
                      <Link href="/users" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start hover:bg-accent">
                          <Users className="mr-2 h-4 w-4" />
                          {tNav("users")}
                        </Button>
                      </Link>
                    )}
                    {showSuperAdminItems && (
                      <Link href="/admin/organization" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start hover:bg-accent">
                          <Settings className="mr-2 h-4 w-4" />
                          Config
                        </Button>
                      </Link>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            )}
          </SignedIn>
        </div>
      </div>
    </header>
  );
};
