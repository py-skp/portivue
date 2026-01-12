"use client";

import * as React from "react";
import {
    AlertCircle,
    RefreshCw,
    LogIn,
    Search,
    ServerCrash,
    Lock
} from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/Button";

interface ErrorStateProps {
    error: string | Error | null;
    onRetry?: () => void;
    title?: string;
}

export function ErrorState({ error, onRetry, title }: ErrorStateProps) {

    if (!error) return null;

    const errorString = typeof error === "string" ? error : error.message;

    // Parse error type
    const is401 = errorString.includes("401") || errorString.toLowerCase().includes("unauthorized");
    const is403 = errorString.includes("403") || errorString.toLowerCase().includes("forbidden");
    const is404 = errorString.includes("404") || errorString.toLowerCase().includes("not found");
    const isNetworkError = errorString.toLowerCase().includes("fetch") || errorString.toLowerCase().includes("network");

    let displayTitle = title || "System Interruption";
    let displayMessage = "We encountered an unexpected issue while retrieving your data.";
    let Icon = AlertCircle;
    let showRetry = !!onRetry;
    let showLogin = false;

    if (is401) {
        displayTitle = "Session Expired";
        displayMessage = "Your security session has timed out. Please sign in again to continue.";
        Icon = Lock;
        showLogin = true;
        showRetry = false;
    } else if (is403) {
        displayTitle = "Access Restricted";
        displayMessage = "You don't have the necessary permissions to view this resource.";
        Icon = Lock;
        showRetry = false;
    } else if (is404) {
        displayTitle = "Data Not Found";
        displayMessage = "The information you requested couldn't be located. It may have been moved or deleted.";
        Icon = Search;
    } else if (isNetworkError) {
        displayTitle = "Connection Issue";
        displayMessage = "We're having trouble reaching the server. Please check your internet connection.";
        Icon = ServerCrash;
    }

    return (
        <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl shadow-red-500/5">
                <div className="p-8 md:p-12 flex flex-col items-center text-center">
                    <div className="h-20 w-20 rounded-3xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-8 ring-1 ring-red-100 dark:ring-red-500/20">
                        <Icon size={40} className="text-red-500" />
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
                        {displayTitle}
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mb-10 max-w-md">
                        {displayMessage}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {showRetry && (
                            <Button
                                onClick={onRetry}
                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-8 py-6 rounded-2xl text-base font-bold flex items-center gap-2 group shadow-xl"
                            >
                                <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                                Retry Request
                            </Button>
                        )}

                        {showLogin && (
                            <Link href="/login" className="w-full sm:w-auto">
                                <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-6 rounded-2xl text-base font-bold flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20">
                                    <LogIn size={20} />
                                    Sign In Again
                                </Button>
                            </Link>
                        )}

                        {!showLogin && !showRetry && (
                            <Button
                                onClick={() => window.location.reload()}
                                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 px-8 py-6 rounded-2xl text-base font-bold flex items-center gap-2 group shadow-xl"
                            >
                                <RefreshCw size={20} />
                                Reload Page
                            </Button>
                        )}
                    </div>
                </div>


            </div>
        </div>
    );
}
