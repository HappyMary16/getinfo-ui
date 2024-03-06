import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const useGetCategories = () => {
    return useQuery(
        ["categories"],
        () => {
            return axios.get<IGetCategory[]>("/api/directions");
        },
        {
            select: ({ data }) => data,
            // enabled: false
        },
    );
};

export default useGetCategories;
