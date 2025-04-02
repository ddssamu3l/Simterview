"use client"
import React from 'react'
import { z } from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form'
import { useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'

const interviewFormSchema = z.object({
  type: z.enum(["behavioral", "technical"]),
  role: z.string().min(1, "Role is required"),
  difficulty: z.enum(["Intern", "Junior/New Grad", "Mid Level", "Senior"]),
  jobDescription: z.string().optional(),
})

const CustomInterviewForm = () => {
  const form = useForm<z.infer<typeof interviewFormSchema>>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: {
      type: "behavioral",
      role: "",
      difficulty: "Junior/New Grad",
      jobDescription: "",
    },
  })

  const isBehavioral = form.watch("type") === "behavioral";

  async function onSubmit(values: z.infer<typeof interviewFormSchema>) {
    console.log(values)
    
  }

  return (
    <div className="flex items-center justify-center mx-auto max-w-7xl h-screen max-sm:px-4 max-sm:py-8 mt-[-96]">
      <div className="card-border max-sm:border-none min-w-[380px] lg:min-w-[566px]">
        <div className="flex flex-col gap-6 card py-14 px-10">
          <div className="flex flex-row gap-2 justify-center">
            <h1 className="text-light-100">Custom Interview</h1>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4 mt-2 form">

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Interview Type*</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select interview type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="behavioral">Behavioral Interview</SelectItem>
                            <SelectItem value="technical">Technical Interview</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Role*</FormLabel>
                    <FormControl>
                      <Input placeholder="Write interview role..."{...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label">Difficulty*</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select difficulty level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="Intern">Intern</SelectItem>
                            <SelectItem value="Junior/New Grad">Junior/New Grad</SelectItem>
                            <SelectItem value="Mid Level">Mid Level</SelectItem>
                            <SelectItem value="Senior">Senior</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isBehavioral && (
                <FormField
                  control={form.control}
                  name="jobDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="label">Job Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Paste job description here..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full py-3 rounded-md font-bold"
                >
                  Create Interview
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default CustomInterviewForm