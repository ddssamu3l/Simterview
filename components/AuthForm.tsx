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
          router.push("/interview-list");
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
        router.push("/");
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
        router.push("/");
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
    <div className="card-border min-w-[380px] lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image
            src="/icon.png"
            alt="simterview icon"
            height={50}
            width={44}
          />
          <h1 className="text-light-100">Simterview</h1>
        </div>
        <h3 className="text-light-100 text-xl lg:text-2xl">Practice SWE interviews with AI</h3>
        <Button
          className="bg-transparent hover:bg-dark-300 border text-light-100 w-full mt-4 font-bold"
          onClick={signInWithGitHub}
          disabled={isLoading}
        >
          <Image src="/github.svg" alt="GitHub logo" width={24} height={24} />
          {(isSignIn)
            ? <p>Sign in with GitHub</p>
            : <p>Sign up with GitHub</p>
          }
        </Button>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4 mt-2 form">
            {(!isSignIn) && (
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
            <div className="items-top flex space-x-2">
              <Checkbox
                id="show-password"
                checked={showPassword}
                onCheckedChange={() => setShowPassword(!showPassword)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="show-password"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  show password
                </label>
              </div>
            </div>
            <Button
              type="submit"
              className="mt-6 font-bold"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : (isSignIn ? 'Sign in' : "Create an account")}
            </Button>
          </form>
        </Form>
        <p className="text-center mt-[-2]">
          {(isSignIn) ? 'Don\'t have an account?' : 'Have an account already?'}
          <Link
            href={(isSignIn) ? '/sign-up' : '/sign-in'}
            className="font-bold text-user-primary ml-1"
          >
            {(isSignIn) ? "Sign up" : "Sign in"}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default AuthForm