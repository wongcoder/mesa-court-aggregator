# POST https://anc.apm.activecommunities.com/mesaaz/rest/reservation/quickreservation/availability?locale=en-US

Accept: */*
Accept-Encoding: gzip, deflate, br, zstd
Accept-Language: en-US,en;q=0.9
Connection: keep-alive
Content-Length: 185
Content-Type: application/json;charset=utf-8
Cookie: s_fid=0D2D7F33F531B95B-14F388264BEC7F86; __reveal_ut=0db2bbba-48f0-4ad7-7a7c-2ab06c67c7ed; JSESSIONID=node01via6ppvavioe1bw911i4ur8tx576644.node0; mesaaz_LOGGED_JSESSIONID=; mesaaz_JSESSIONID=node01bt1nnpe6ug4w1vl05li2sv90y111830.node0; mesaaz_FullPageView=true; mesaaz_NEW_CUI_STATUS=true; TS01ee6c1c=01921c5c3ebb1d9589be5f8449a508b38218e1d3ac3017fbb6d015e87bc87d8f724b5bbd6e86eb1d4042ab0067b955e77e5c69b1a783614e81c1d708787669fb37ad2bcfa2c7233ee891c08f944794e992bf3f55610ad6f81b419b6a4df9b97f99427b4b7b6213633e88b6de3e5817ca5463d84c38; mesaaz_locale=en-US; s_cc=true; s_vi=[CS]v1|344AD51933BF1C26-6000053AAE3609A2[CE]; _ga=GA1.1.741201990.1754638898; __utma=171762928.741201990.1754638898.1754638899.1754638899.1; __utmc=171762928; __utmz=171762928.1754638899.1.1.utmcsr=mesaaz.gov|utmccn=(referral)|utmcmd=referral|utmcct=/; __utmt=1; __utmb=171762928.1.10.1754638899; __utma=171762928.741201990.1754638898.1754638899.1754638899.1; __utmc=171762928; __utmz=171762928.1754638899.1.1.utmcsr=mesaaz.gov|utmccn=(referral)|utmcmd=referral|utmcct=/; s_sq=%5B%5BB%5D%5D; BIGipServer~activenet~anc_prod_mesaaz=!SWpaKwHzixuEHEUsWkhVSSLCNz/zcY5AZsA3dhUEpx9diiJmOK409GVQd5y1yoG5961CQl79xQ6wA5M=; TS01252aa9=01921c5c3ed93c9fea15bb3c8c9bc75421c05d73143017fbb6d015e87bc87d8f724b5bbd6ed6745a91e44571170463c3dcbcb2806f73d44248353da0175a241023170daeffd474d3a4f3dd2d9b3e4122129369bb6f; BIGipServer~activenet~activenet_newcui_prod_pool_ats=!7GUqC9Ov6Ov/giUsWkhVSSLCNz/zceWhzjP5BLHoFIPYcdKzmrSoL0Acs0UUkpsH+xbd3zYwHG9GeA==; _ga_829M3D1BQX=GS2.1.s1754638898$o1$g1$t1754638903$j55$l0$h0; __utmb=171762928.2.10.1754638899; utag_main=_sn:2$_se:10%3Bexp-session$_ss:0%3Bexp-session$_st:1754640791416%3Bexp-session$ses_id:1754638897480%3Bexp-session$_pn:1%3Bexp-session$vapi_domain:activecommunities.com
DNT: 1
Host: anc.apm.activecommunities.com
Origin: https://anc.apm.activecommunities.com
Referer: https://anc.apm.activecommunities.com/mesaaz/reservation/landing/quick?locale=en-US&groupId=5
Sec-Fetch-Dest: empty
Sec-Fetch-Mode: cors
Sec-Fetch-Site: same-origin
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36
X-CSRF-Token: eb2e1b71-c969-4eff-b0fd-6d0ac24db23e
X-Requested-With: XMLHttpRequest
page_info: {"page_number":1,"total_records_per_page":20}
sec-ch-ua: "Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "macOS"

## Response
{
    "headers": {
        "sessionRefreshedOn": null,
        "sessionExtendedCount": 0,
        "response_code": "0000",
        "response_message": "Successful",
        "page_info": {
            "order_by": "",
            "total_records_per_page": 20,
            "page_number": 1,
            "total_records": 0,
            "order_option": "ASC",
            "total_page": 1
        }
    },
    "body": {
        "availability": {
            "time_increment": 30,
            "default_starting_time": "1899-12-30 06:00:00",
            "default_ending_time": "1899-12-30 22:00:00",
            "time_slots": [
                "06:00:00",
                "06:30:00",
                "07:00:00",
                "07:30:00",
                "08:00:00",
                "08:30:00",
                "09:00:00",
                "09:30:00",
                "10:00:00",
                "10:30:00",
                "11:00:00",
                "11:30:00",
                "12:00:00",
                "12:30:00",
                "13:00:00",
                "13:30:00",
                "14:00:00",
                "14:30:00",
                "15:00:00",
                "15:30:00",
                "16:00:00",
                "16:30:00",
                "17:00:00",
                "17:30:00",
                "18:00:00",
                "18:30:00",
                "19:00:00",
                "19:30:00",
                "20:00:00",
                "20:30:00",
                "21:00:00",
                "21:30:00"
            ],
            "resources": [
                {
                    "resource_id": 611,
                    "resource_name": "Pickleball Court 01",
                    "package_id": 0,
                    "package_name": null,
                    "type_id": 0,
                    "type_name": "facility",
                    "warning_messages": [
                        "Residents cannot make reservations more than 14 day(s) in advance."
                    ],
                    "time_slot_details": [
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        }
                    ],
                    "attendance": 0
                },
                {
                    "resource_id": 841,
                    "resource_name": "Pickleball Court 01A",
                    "package_id": 0,
                    "package_name": null,
                    "type_id": 0,
                    "type_name": "facility",
                    "warning_messages": [
                        "Residents cannot make reservations more than 14 day(s) in advance."
                    ],
                    "time_slot_details": [
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        }
                    ],
                    "attendance": 0
                },
                {
                    "resource_id": 842,
                    "resource_name": "Pickleball Court 01B",
                    "package_id": 0,
                    "package_name": null,
                    "type_id": 0,
                    "type_name": "facility",
                    "warning_messages": [
                        "Residents cannot make reservations more than 14 day(s) in advance."
                    ],
                    "time_slot_details": [
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        }
                    ],
                    "attendance": 0
                },
                {
                    "resource_id": 681,
                    "resource_name": "Pickleball Court 09A",
                    "package_id": 0,
                    "package_name": null,
                    "type_id": 0,
                    "type_name": "facility",
                    "warning_messages": [
                        "Residents cannot make reservations more than 14 day(s) in advance."
                    ],
                    "time_slot_details": [
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        }
                    ],
                    "attendance": 0
                },
                {
                    "resource_id": 682,
                    "resource_name": "Pickleball Court 09B",
                    "package_id": 0,
                    "package_name": null,
                    "type_id": 0,
                    "type_name": "facility",
                    "warning_messages": [
                        "Residents cannot make reservations more than 14 day(s) in advance."
                    ],
                    "time_slot_details": [
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        }
                    ],
                    "attendance": 0
                },
                {
                    "resource_id": 715,
                    "resource_name": "Pickleball Court 13A",
                    "package_id": 0,
                    "package_name": null,
                    "type_id": 0,
                    "type_name": "facility",
                    "warning_messages": [
                        "Residents cannot make reservations more than 14 day(s) in advance."
                    ],
                    "time_slot_details": [
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        }
                    ],
                    "attendance": 0
                },
                {
                    "resource_id": 716,
                    "resource_name": "Pickleball Court 13B",
                    "package_id": 0,
                    "package_name": null,
                    "type_id": 0,
                    "type_name": "facility",
                    "warning_messages": [
                        "Residents cannot make reservations more than 14 day(s) in advance."
                    ],
                    "time_slot_details": [
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        }
                    ],
                    "attendance": 0
                },
                {
                    "resource_id": 717,
                    "resource_name": "Pickleball Court 14A",
                    "package_id": 0,
                    "package_name": null,
                    "type_id": 0,
                    "type_name": "facility",
                    "warning_messages": [
                        "Residents cannot make reservations more than 14 day(s) in advance."
                    ],
                    "time_slot_details": [
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        }
                    ],
                    "attendance": 0
                },
                {
                    "resource_id": 718,
                    "resource_name": "Pickleball Court 14B",
                    "package_id": 0,
                    "package_name": null,
                    "type_id": 0,
                    "type_name": "facility",
                    "warning_messages": [
                        "Residents cannot make reservations more than 14 day(s) in advance."
                    ],
                    "time_slot_details": [
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 0,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        },
                        {
                            "status": 1,
                            "selected": false
                        }
                    ],
                    "attendance": 0
                }
            ],
            "event_name": "",
            "reno": -1,
            "show_reserve_btn": false,
            "reservation_request_msg": null,
            "last_modify_timestamp": -1,
            "hide_set_time_range_button": false
        }
    }
}
