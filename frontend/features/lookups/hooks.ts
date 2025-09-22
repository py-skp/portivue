import useSWR from "swr";
import { getJSON } from "@/app/api";

export type Currency = { code: string; name?: string };
export type AssetClass = { id: number; name: string };
export type Account = { id: number; name: string; currency_code: string };

export function useCurrencies()  { 
  return useSWR<Currency[]>("/lookups/currencies", getJSON); 
}
export function useAssetClasses(){ 
  return useSWR<AssetClass[]>("/lookups/asset-classes", getJSON); 
}
export function useAccounts()    { 
  return useSWR<Account[]>("/lookups/accounts", getJSON); 
}