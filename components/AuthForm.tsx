/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import React, { useState } from 'react'
import Image from 'next/image'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import Link from 'next/link'
import { toast } from 'sonner'

import FormField from "@/components/FormField"
import { useRouter } from 'next/navigation'
import { Checkbox } from './ui/checkbox'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GithubAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { auth } from '@/firebase/client'
import { signIn, signUp, handleGitHubAuth } from '@/lib/actions/auth.action'

const redirectRoute = "/";
type FormType = 'sign-in' | 'sign-up';

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === 'sign-up' ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(6),
  })
}

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const formSchema = authFormSchema(type)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  async function signInWithGitHub() {
    try {
      setIsLoading(true);
      // github popup sign in
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);

      if (result.user) {
        const idToken = await result.user.getIdToken();
        const authResult = await handleGitHubAuth(idToken);

        if (authResult.success) {
          toast.success("GitHub authentication successful!");
          router.push(redirectRoute);
        } else {
          toast.error(authResult.message || "Authentication failed");
        }
      }else{
        console.error("Error: no user returned from GitHub sign in");
        toast.error("GitHub authentication failed");
      }
    } catch (error: any) {
      console.error("GitHub auth error:", error);
      if (error.code === "auth/account-exists-with-different-credential") {
        toast.error("Account already exists with another sign in method. Please sign in again with a different sign in method.")
        return;
      }
      toast.error(error.message || "GitHub authentication failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setIsLoading(true);
      if (type === 'sign-up') {
        const { name, email, password } = values;

        const userCredentials = await createUserWithEmailAndPassword(auth, email, password);

        const result = await signUp({
          uid: userCredentials.user.uid,
          name: name!,
          email,
          password,
        })

        if (!result?.success) {
          toast.error(result?.message);
          return;
        }
        toast.success('Account created! Signing in.');

        // automatic sign-in
        const signInCredentials = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await signInCredentials.user.getIdToken();

        if (!idToken) {
          toast.error("Automatic sign-in failed. Please sign-in manually");
          return;
        }

        await signIn({
          email, idToken,
        });
        router.push(redirectRoute);
      } else {
        const { email, password } = values;
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const idToken = await userCredential.user.getIdToken();

        if (!idToken) {
          toast.error("Error with sign in");
          return;
        }

        await signIn({
          email, idToken,
        })
        router.push(redirectRoute);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const isSignIn = type === 'sign-in';
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="card-border min-w-[380px] lg:min-w-[566px] bg-transparent">
      <div className="flex flex-col gap-8 py-12 px-8 lg:px-10">
        {/* Logo and title */}
        <div className="flex flex-col items-center space-y-6">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.png"
              alt="simterview icon"
              height={50}
              width={44}
              unoptimized
            />
            <h1 className="text-light-100 text-2xl font-bold">Simterview</h1>
          </div>
          <h3 className="text-light-100 text-xl text-center">
            Practice SWE interviews with AI
          </h3>
        </div>

        {/* GitHub sign-in button */}
        <Button
          className="bg-dark-300 hover:bg-dark-200 border border-dark-100 text-light-100 w-full font-medium flex items-center gap-3 h-12"
          onClick={signInWithGitHub}
          disabled={isLoading}
        >
          <Image src="/github.svg" alt="GitHub logo" width={22} height={22} unoptimized />
          <span>
            {isSignIn ? "Sign in with GitHub" : "Sign up with GitHub"}
          </span>
        </Button>

        {/* Divider */}
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-slate-700"></div>
          <span className="mx-4 text-sm text-slate-400">or continue with email</span>
          <div className="flex-grow border-t border-slate-700"></div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-5">
            {!isSignIn && (
              <FormField
                control={form.control}
                name="name"
                label="Username"
                placeholder="Your new username"
                type="text"
              />
            )}
            <FormField
              control={form.control}
              name="email"
              label="Email"
              placeholder="Your email"
              type="email"
            />
            <FormField
              control={form.control}
              name="password"
              label="Password"
              placeholder="Your password"
              type={showPassword ? 'text' : 'password'}
            />

            {/* Checkbox styling */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="show-password"
                checked={showPassword}
                onCheckedChange={() => setShowPassword(!showPassword)}
                className="border-slate-500"
              />
              <label
                htmlFor="show-password"
                className="text-sm text-slate-300 leading-none cursor-pointer"
              >
                Show password
              </label>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full mt-4 h-12 font-bold"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : (isSignIn ? "Sign in" : "Create an account")}
            </Button>
          </form>
        </Form>

        {/* Account toggle link */}
        <p className="text-center text-slate-300 text-sm">
          {isSignIn ? "Don't have an account?" : "Have an account already?"}
          <Link
            href={isSignIn ? '/sign-up' : '/sign-in'}
            className="font-bold text-user-primary ml-2"
          >
            {isSignIn ? "Sign up" : "Sign in"}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default AuthForm