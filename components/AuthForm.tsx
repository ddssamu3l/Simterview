"use client"
import React from 'react'
import Image from 'next/image'

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import Link from 'next/link'
import { toast } from 'sonner'
//import { Input } from "@/components/ui/input"

import FormField from "@/components/FormField"

const authFormSchema = (type: FormType) =>{
  return z.object({
    name: type === 'sign-up' ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(6), 
  })
}

const AuthForm = ({type}: {type: FormType}) => {
  const formSchema = authFormSchema(type)
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    try{
      if(type === 'sign-up'){
        console.log("Sign up attempt: " + values);
      }else{
        console.log("Sign in attempt: " + values);
      }
    }catch(error){
      console.log(error);
      toast.error(`An error has occured: ${error}`);
    }
  }

  const isSignIn = type === 'sign-in';

  return (
    <div className="card-border min-w-[380px] lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image 
            src="/icon.png"
            alt="simterview icon"
            height={50}
            width={50}
          />
          <h2 className="text-light-100">Simterview</h2>
        </div>
        <h3 className="text-light-100 text-xl lg:text-2xl">Practice SWE interviews with AI</h3>
      
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4 mt-4 form">
            {(!isSignIn) && (
              <FormField 
                control={form.control} 
                name="name" 
                label="Username"
                placeholder="Your new username"
              />
            )}
            <FormField
              control={form.control}
              name="email"
              label="Email"
              placeholder="Your email"
            />
            <FormField
              control={form.control}
              name="password"
              label="Password"
              placeholder="Your password"
            />
            <Button type="submit" className="mt-8">{(isSignIn)? 'Sign in' : "Create an account"}</Button>
          </form>
        </Form>
        <p className="text-center mt-[-2]">
          {(isSignIn) ? 'Have an account already?' : 'Have an account already?'}
          <Link 
            href = {(isSignIn) ? '/sign-up' : 'sign-in'}
            className = "font-bold text-user-primary ml-1"
          >
            {(isSignIn)? "Sign up" : "Sign in"}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default AuthForm